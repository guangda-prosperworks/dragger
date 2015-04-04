/**!
 * Dragger
 * @author	Guangda Zhang   <zhangxiaoyu9350@gmail.com>
 * @license MIT
 */

(function($) {

	'use strict';

	var isTouchable = 'ontouchstart' in window || navigator.msMaxTouchPoints,
		isIEDragDrop = !! document.createElement('div').dragDrop,
		startDraggingEvent = isIEDragDrop ? "selectstart" :
			(isTouchable ? "touchstart" : "mousedown"),
		$draggingEl,
		$ghostEl,
		$placeholderEl,
		$specialPlaceholderEl,
		spTimeout,
		placeholderChanged,
		$lastPlaceholderParent,
		lastPlaceholderIndex,
		$lastEl,
		$nextEl,
		lastCSS,
		lastRect,
		activeGroup,
		isPlaceholderInserted,
		// is in silent
		isInSilent = false,
		// silent interval
		shortSilentInterval = 0,
		defaultSilentInterval = 30,
		middleSilentInterval = 300,
		longSilentInterval = 1000,
		pcTimeoutFunc,
		groupAttrName = 'dragger-group-' + (+new Date),
		innerClassName = 'inner',
		dragCriticalValue = 5,
		touchDetectInterval = 150,
		touchIntervalFunc,
		touchEvt,
		touchStartXY;

	$.fn.dragger = function(settings) {

		if (settings === 'destroy') {
			this.each(function() {
				destroy(this);
			});
			return;
		}

		var config = {
			group: Math.random(),
			handle: null,
			draggable: null,
			dragOnly: false,
			draggingClass: 'dragger-ing',
			placeholderClass: 'placeholder',
			notAllow: null,
			defaultPlaceholder: null,
			specialPlaceholder: null,
			placeholderChangeTimeout: null,

			onStart: $.noop,
			onAdd: $.noop,
			onUpdate: $.noop,
			onRemove: $.noop,
			onEnd: $.noop
		};

		settings && $.extend(config, settings);

		var placeholderHtml = config.defaultPlaceholder || '<li class="' + config.placeholderClass + '"></li>';

		this.each(function() {

			if (!config.draggable) {
				// if draggableSelector not specified
				// we use its children's nodeName
				// or if it's ul/ol, we use 'li'
				// or we just use '*'
				config.draggable = this.children[0] && this.children[0].nodeName || (/[uo]l/i.test(this.nodeName) ? 'li' : '*');
				config.draggable = config.draggable.toLowerCase();
			}

			$(this)
				// bind all customized events
				.on('Start.dragger', config.onStart)
				.on('Add.dragger', config.onAdd)
				.on('Update.dragger', config.onUpdate)
				.on('Remove.dragger', config.onRemove)
				.on('End.dragger', config.onEnd)

				// bind browser events
				.on(startDraggingEvent + '.dragger', $.proxy(initDragger, this))
				.on("dragover.dragger dragenter.dragger", $.proxy(onDragOver, this))

				.attr(groupAttrName, config.group);

			if (isTouchable) {
				$(this).on("touchdragover.dragger", $.proxy(onDragOver, this));
			}
		});

		function initDragger(evt) {
			var $target = $(evt.target),
				$dragEl;

			// if it has handle element, that means only when user click the handle element
			// will trigger the dragging
			if (config.handle) {
				$target = $target.closest(config.handle, this);
				// if user clicks some area that doesn't belong to handle, we just do nothing
				if (!$target.length) return;
			}

			// find the drag elements
			$dragEl = $target.closest(config.draggable, this);
			if (!$dragEl.length) return;

			// IE 9 support
			if (evt.type === 'selectstart') {
				var dragElNodeName = $dragEl[0].nodeName.toLowerCase();
				if (dragElNodeName != 'a' && dragElNodeName != 'img')
					$dragEl[0].dragDrop();
			}

			// ** NOTICE **
			// when you click the handler, then the whole li can be dragged,
			// this is to fix this issue, but i don't think it's a very good solution
			// just make it work at first
			var me = this;
			$target.one('touchend mouseup', function(evt) {
				onDrop.call(me);
				changeDraggableStatus($dragEl, false);
			});

			// confirm the dragging element is the direct child of the outer container
			if ($dragEl.parent()[0] === this) {
				changeDraggableStatus($dragEl, true);

				// disable "draggable" for a and img
				changeDraggableStatus($dragEl.find("a,img"), false);

				if (isTouchable) {
					touchStartXY = {
						x: evt.originalEvent.touches[0].clientX,
						y: evt.originalEvent.touches[0].clientY
					};
					evt.target = $dragEl[0];
					$.proxy(onDragStart, this)(evt);
					evt.preventDefault();
				}

				// bind drag events
				$(this)
					.on('dragstart.dragger', $.proxy(onDragStart, this))
					.on('dragend.dragger', $.proxy(onDrop, this));
				$(document).on('dragover.dragger', onGlobalDragOver);

				// in case select something, just remove selections
				// if there's a handler and user select some text
				// then the drag and drop will be triggered for that text
				// so we need to remove the selection
				try {
					if (document.selection) {
						document.selection.empty();
					} else {
						window.getSelection().removeAllRanges();
					}
				} catch (e) {}
			}

		}

		function onDragStart(evt) {
			var // since the draggable element is draggable now
				// so $target will be the draggable element
				$target = $(evt.target),
				dataTransfer = evt.originalEvent.dataTransfer;

			$nextEl = $target.next();

			if (config.dragOnly) {
				$draggingEl = $target.clone();
				$draggingEl.on('End.dragger', config.onEnd);
			} else {
				$draggingEl = $target;
			}

			$placeholderEl = $(placeholderHtml);

			if (config.specialPlaceholder) {
				for (var sel in config.specialPlaceholder) {
					if ($target.filter(sel).length) {
						$specialPlaceholderEl = $(config.specialPlaceholder[sel])
							.css("height", 1)
							.css("transition", "height ease 0.5s");
					}
				}

				if (config.placeholderChangeTimeout) {
					for (var sel in config.placeholderChangeTimeout) {
						if ($target.filter(sel).length) {
							spTimeout = config.placeholderChangeTimeout[sel];
						}
					}
				}

				if (spTimeout === 0 && $specialPlaceholderEl) {
					$placeholderEl = $specialPlaceholderEl;
				}
			}

			activeGroup = config.group;

			if (isTouchable) {
				var rect = $target[0].getBoundingClientRect(),
					targetMargin = {
						top: parseInt($target.css("marginTop")),
						left: parseInt($target.css("marginLeft"))
					},
					ghostRect;

				$ghostEl = $target.clone();

				copyCss($target, $ghostEl);

				$ghostEl
					.css("top", rect.top - targetMargin.top)
					.css("left", rect.left - targetMargin.left)
					.css("opacity", 0.8)
					.css("position", "fixed")
					.css("zIndex", 100000);

				$('body').append($ghostEl);

				$(document)
					.on("touchmove.dragger", $.proxy(onTouchMove, this))
					.on("touchend.dragger", $.proxy(onDrop, this))
					.on("touchcancel.dragger", $.proxy(onDrop, this));

				touchIntervalFunc = setInterval(detectTouchDragOver, touchDetectInterval);

			} else {
				dataTransfer.effectAllowed = 'move';
				dataTransfer.setData('Text', $target.text());

				$(document).on('drop.dragger', $.proxy(onDrop, this));
			}

			isPlaceholderInserted = false;

			// trigger the customized start event
			$target.trigger('Start.dragger', [$target]);

			// toggle effects for dragging element
			toggleEffects();
		}

		function onTouchMove(evt) {
			if (!touchStartXY) return;

			touchEvt = evt.originalEvent.touches[0];
			var dx = touchEvt.clientX - touchStartXY.x,
				dy = touchEvt.clientY - touchStartXY.y,
				translateExpr = 'translate3d(' + dx + 'px,' + dy + 'px, 0)';

			$ghostEl.css("transform", translateExpr);

			evt.preventDefault();
		}

		function detectTouchDragOver(evt) {
			if (!touchEvt) return;

			$ghostEl.hide();

			var target = document.elementFromPoint(touchEvt.clientX, touchEvt.clientY),
				$dragArea = $(target).closest('['+groupAttrName+']');

			if ($dragArea.length) {
				var touchDragOverEvent = jQuery.Event("touchdragover.dragger");
				touchDragOverEvent.target = target;
				touchDragOverEvent.originalEvent = {
					clientX: touchEvt.clientX,
					clientY: touchEvt.clientY
				};
				$dragArea.trigger(touchDragOverEvent);
			}

			$ghostEl.show();
		}

		function onDragOver(evt) {
			// in case we have multiple level drag over
			// we need to stop propagation
			evt.stopPropagation();

			if (!isInSilent && !config.dragOnly && (activeGroup === config.group)) {

				// if we have notAllow set
				if (config.notAllow) {
					if ($draggingEl) {
						var $notAllowEl = $draggingEl.filter(config.notAllow);
						if ($notAllowEl.length) return;
					}
				}

				var $target = $(evt.target).closest(config.draggable, this),
					domOperated = false;

				if ( // if the container don't have children
					!$(this).children().length ||
					// if the target is container itself, and it's dragged to the bottom of the container
					(this === evt.target && draggingAtBottom(this, evt.originalEvent))) {
					// then we append the placeholder to the container
					$(this).append($placeholderEl);
					domOperated = true;
				}
				// if drag over "this" and its before "this"
				else if ($(this).children().length &&
					evt.target === this && draggingAtTop(this, evt.originalEvent)) {
					// the prepend the placeholder
					$(this).prepend($placeholderEl);
					domOperated = true;
				}
				// if drag over target exists and it's not placeholder itself
				// and also if the group name exists
				else if ($target.length && $target[0] !== $placeholderEl[0] && $target.parent().attr(groupAttrName)) {

					var inDeeperLevel = false,
						forceAfter = null,
						useShortInterval = false;

					// judge whether use short interval
					if ($(this).hasClass(innerClassName)) {
						var outterDraggable = $(this).closest(config.draggable);
						// if the outterdraggable is the first child
						if (outterDraggable.length &&
							outterDraggable.parent().children()[0] === outterDraggable[0]) {
							useShortInterval = true;
						}
					}

					if ($target.find('['+groupAttrName+']').length) {
						var targetRect = $target[0].getBoundingClientRect(),
							evtClientY = evt.originalEvent.clientY;

						if ($target.parent().children()[0] === $target[0]) {
							if (evtClientY < targetRect.top + targetRect.height
								&& targetRect.top + targetRect.height - evtClientY < 20) {
								inDeeperLevel = true;
							}
						} else if ($target.parent().children().last()[0] === $target[0]) {
							if (evtClientY === targetRect.top) {
								inDeeperLevel = true;
							}

						} else {
							inDeeperLevel = true;
						}
					}

					if (inDeeperLevel) return;

					if (!$lastEl || $lastEl[0] !== $target[0]) {
						$lastEl = $target;
						lastCSS = {
							cssFloat: $target.css('float'),
							display: $target.css('display')
						};
						lastRect = $target[0].getBoundingClientRect();
					}

					var
						rect = lastRect,
						width = rect.right - rect.left,
						height = rect.bottom - rect.top,
						floating = /left|right|inline/.test(lastCSS.cssFloat + lastCSS.display),
						skew = floating ? (evt.originalEvent.clientX - rect.left) / width : (evt.originalEvent.clientY - rect.top) / height,
						isWide = ($target.width() > $placeholderEl.width()),
						isLong = ($target.height() > $placeholderEl.height()),
						$nextSibling = $target.next(),
						after;

					if (floating) {
						after = ($target.prev()[0] === $placeholderEl[0]) && !isWide || skew > .5 && isWide
					} else {
						after = ($target.next()[0] !== $placeholderEl[0]) && !isLong || skew > .5 && isLong;
					}

					if (after && !$nextSibling.length) {
						$(this).append($placeholderEl);
					} else {
						var $before = after ? $nextSibling : $target;
						$before.before($placeholderEl);
					}
					domOperated = true;
				}


				if (domOperated) {

					var domChanged = false,
						$currentPlaceholderParent = $placeholderEl.parent(),
						currentPlaceholderIndex = findIndex($currentPlaceholderParent, $placeholderEl);

					if ($lastPlaceholderParent && lastPlaceholderIndex &&
						$currentPlaceholderParent[0] === $lastPlaceholderParent[0] &&
						currentPlaceholderIndex === lastPlaceholderIndex) {
						domChanged = false;
					} else {
						domChanged = true;
					}

					$lastPlaceholderParent = $currentPlaceholderParent;
					lastPlaceholderIndex = currentPlaceholderIndex;

					isInSilent = true;
					var interval = useShortInterval ? shortSilentInterval : defaultSilentInterval;

					// when drag something from outter to inner
					if (evt.target &&
						$(this).hasClass(innerClassName) && evt.target === this) {
						interval = longSilentInterval;
					}

					// when drag something from inner to outer
					if ($draggingEl && $draggingEl.length &&
						$draggingEl.parent().hasClass(innerClassName) &&
						!$(this).hasClass(innerClassName)) {
						interval = middleSilentInterval;
					}

					if (domChanged && spTimeout) {
						if (placeholderChanged) {
							var newPlaceholder = $(placeholderHtml);
							$placeholderEl.before(newPlaceholder);
							$placeholderEl.remove();
							$placeholderEl = newPlaceholder;
							$specialPlaceholderEl && $specialPlaceholderEl.css("height", 1);
							placeholderChanged = null;
							interval = middleSilentInterval;
						}

						pcTimeoutFunc && clearTimeout(pcTimeoutFunc);
						pcTimeoutFunc = setTimeout(function() {
							$placeholderEl.before($specialPlaceholderEl);
							$placeholderEl.remove();
							$placeholderEl = $specialPlaceholderEl;
							setTimeout(function() {
								$placeholderEl && $placeholderEl.css("height", "");
							}, 50);
							placeholderChanged = true;
						}, spTimeout);
					}

					setTimeout(unSilent, interval);
				}

				isPlaceholderInserted = true;

				$draggingEl.hide();
			}
		}

		function onGlobalDragOver(evt) {
			evt.originalEvent.dataTransfer.dropEffect = 'move';
			evt.preventDefault();
		}

		function onDrop(evt) {

			$(document)
				.off('drop.dragger')
				.off('dragover.dragger')

				.off('touchmove.dragger')
				.off('touchend.dragger')
				.off('touchcancel.dragger');

			$(this)
				.off('dragend.dragger')
				.off('dragstart.dragger')
				.off('selectstart.dragger');

			clearInterval(touchIntervalFunc);

			if (evt) {
				evt.preventDefault();
				evt.stopPropagation();

				if ($ghostEl) {
					$ghostEl.remove();
				}

				if ($placeholderEl && isPlaceholderInserted) {
					$placeholderEl.before($draggingEl);
					$placeholderEl.remove();
				}

				if ($draggingEl && $draggingEl.length) {
					$draggingEl
						.show()
						.toggleClass(config.draggingClass);

					$draggingEl.trigger('End.dragger', [$draggingEl]);

					if (!$.contains(this, $draggingEl[0])) {
						$(this).trigger('Remove.dragger', [$draggingEl]);
						$draggingEl.trigger('Add.dragger', [$draggingEl]);
					} else if ($draggingEl.next()[0] !== $nextEl[0]) {
						$draggingEl.trigger('Update.dragger', [$draggingEl])
					}

					$draggingEl[0].draggable = "";
				}

				// Set NULL
				$draggingEl =
				$specialPlaceholderEl =
				spTimeout =
				placeholderChanged =
				$lastPlaceholderParent =
				lastPlaceholderIndex =
				$nextEl =
				$lastEl =
				lastCSS =
				touchIntervalFunc =
				touchEvt =
				touchStartXY =
				activeGroup = null;
			}
		}

		function destroy(el) {

			$(el)
				.off('Start.dragger')
				.off('Add.dragger')
				.off('Update.dragger')
				.off('Remove.dragger')
				.off('End.dragger')

				.off(startDraggingEvent + '.dragger')

				.off('dragover.dragger')
				.off('dragenter.dragger');

			changeDraggableStatus($(el), false);
			
			onDrop.call(el);
		}

		function draggingAtTop(el, evt) {
			var first = el.getBoundingClientRect();
			return evt.clientY - first.top < dragCriticalValue;
		}

		function draggingAtBottom(el, evt) {
			var last = el.lastElementChild.getBoundingClientRect();
			return evt.clientY - (last.top + last.height) > dragCriticalValue;
		}

		function unSilent() {
			isInSilent = false;
		}

		function toggleEffects() {
			$draggingEl.toggleClass(config.draggingClass);
		}

		function changeDraggableStatus($el, status) {
			if ($el.jquery) {
				$el.each(function() {
					this.draggable = status;
				});
			} else {
				$el.draggable = status;
			}
		}

		function copyCss(source, target) {
			var dom = $(source)[0],
				style,
				dest = {};

			if (window.getComputedStyle) {
				var camelize = function(a, b) {
					return b.toUpperCase();
				};
				style = window.getComputedStyle(dom, null);
				for (var i = 0, l = style.length; i < l; ++i) {
					var prop = style[i];
					var camel = prop.replace(/\-([a-z])/g, camelize);
					var val = style.getPropertyValue(prop);
					dest[camel] = val;
				}
				return target.css(dest);
			}

			if (style = dom.currentStyle) {
				for (var prop in style) {
					dest[prop] = style[prop];
				}
				return target.css(dest);
			}

			if (style = dom.style) {
				for (var prop in style) {
					if (typeof style[prop] != 'function') {
						dest[prop] = style[prop];
					}
				}
			}

			return target.css(dest);
		}

		function findIndex(parent, child) {
			var ret;
			parent.children().each(function(index) {
				if (this === child[0])
					ret = index;
			});
			return ret;
		}

		return this;
	};

})(jQuery);