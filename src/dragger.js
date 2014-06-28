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
		$placeholderEl,
		$lastEl,
		$nextEl,
		lastCSS,
		lastRect,
		activeGroup,
		// is in silent
		isInSilent = false,
		// silent interval
		silentInterval = 30,
		expando = 'Dragger' + (new Date).getTime();

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

				.data(expando, config.group);
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

			// confirm the dragging element is the direct child of the outer container
			if ($dragEl.parent()[0] === this) {
				changeDraggableStatus($dragEl, true);

				// disable "draggable" for a and img
				changeDraggableStatus($dragEl.find("a,img"), false);

				if (isTouchable) {
					// TODO
				}

				// bind drag events
				$(this).on('dragstart.dragger', $.proxy(onDragStart, this));
				$(this).on('dragend.dragger', $.proxy(onDrop, this));
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
						$placeholderEl = $(config.specialPlaceholder[sel]);
					}
				}
			}

			activeGroup = config.group;

			if (isTouchable) {
				// TODO
				// 

			} else {
				dataTransfer.effectAllowed = 'move';
				dataTransfer.setData('Text', $target.text());

				$(document).on('drop.dragger', $.proxy(onDrop, this));
			}

			// trigger the customized start event
			$target.trigger('Start.dragger', [$target]);

			// toggle effects for dragging element
			toggleEffects();
		}

		function onDragOver(evt) {
			if (!isInSilent && !config.dragOnly && (activeGroup === config.group)) {
				// in case we have multiple level drag over
				// we need to stop propagation
				evt.stopPropagation();

				// if we have notAllow set
				if (config.notAllow) {
					if ($draggingEl) {
						var $notAllowEl = $draggingEl.filter(config.notAllow);
						if ($notAllowEl.length) return;
					}
				}

				var $target = $(evt.target).closest(config.draggable, this);

				if ( // if the container don't have children
					!$(this).children().length ||
					// if the target is container itself, and it's dragged to the bottom of the container
					(this === evt.target && draggingAtBottom(this, evt.originalEvent))) {
					// then we append the placeholder to the container
					$(this).append($placeholderEl);
				}
				// if drag over target exists and it's not placeholder itself
				// and also if the group name exists
				else if ($target.length && $target[0] !== $placeholderEl[0] && $target.parent().data(expando)) {
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
						skew = (floating ? (evt.originalEvent.clientX - rect.left) / width : (evt.originalEvent.clientY - rect.top) / height) > .5,
						isWide = ($target.width() > $placeholderEl.width()),
						isLong = ($target.height() > $placeholderEl.height()),
						$nextSibling = $target.next(),
						after;

					isInSilent = true;
					setTimeout(unSilent, silentInterval);

					if (floating) {
						after = ($target.previous()[0] === $placeholderEl[0]) && !isWide || (skew > .5) && isWide
					} else {
						after = ($target.next()[0] !== $placeholderEl[0]) && !isLong || (skew > .5) && isLong;
					}

					if (after && !$nextSibling.length) {
						$(this).append($placeholderEl);
					} else {
						var $before = after ? $nextSibling : $target;
						$before.before($placeholderEl);
					}
				}

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
				.off('dropover.dragger')

				.off('touchmove.dragger')
				.off('touchend.dragger');

			$(this)
				.off('dragend.dragger')
				.off('dragstart.dragger')
				.off('selectstart.dragger');

			if (evt) {
				evt.preventDefault();
				evt.stopPropagation();

				if ($placeholderEl) {
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
				// $placeholderEl =
				$nextEl =
				$lastEl =
				lastCSS =
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

			// touch
			// TODO
			
			onDrop.call(el);
		}

		function draggingAtBottom(el, evt) {
			var last = el.lastElementChild.getBoundingClientRect();
			return evt.clientY - (last.top + last.height) > 5; // min delta
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
	};

})(jQuery);