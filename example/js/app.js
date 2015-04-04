(function() {

	'use strict';

	var a = 10;

	var legoHtml = '<li><span class="lego-move"></span><div class="content"></div></li>',
		frameWin = $(".frame"),
		frameDoc = getDoc(frameWin[0]),
		columnsHtml = 
		['<li>',
			'<div class="row">',
				'<div class="col-sm-6">',
					'<ul class="droppable list-unstyled inner"></ul>',
				'</div>',
				'<div class="col-sm-6">',
					'<ul class="droppable list-unstyled inner"></ul>',
				'</div>',
			'</div>',
		'</li>'].join(''),
		groupHtml = 
		['<li>',
			'<div class="">',
				'<ul class="droppable list-unstyled inner"></ul>',
			'</div>',
		'</li>'].join('');
		

	function getDoc(x) {
		if (!x) return null;
		return x.document ||
			x.contentDocument ||
			x.contentWindow.document;
	}

	function dragStart() {
		$('.droppable').addClass("highlight");
	}

	function dragEnd() {
		$('.droppable').removeClass("highlight");
	}

	function appendLego(evt, item) {
		var legoName = item.data('name'),
			newItem;

		switch(legoName) {
			case 'generic.columns':
				newItem = $(columnsHtml);
			break;
			case 'generic.group':
				newItem = $(groupHtml);
			break;
			default:
				newItem = $(legoHtml);
			break;
		}

		newItem.find(".content").html(legoName.toUpperCase());
		newItem.insertBefore(item);
		newItem.attr('data-name', legoName.toLowerCase());

		item.remove();

		saveConfig();

		switch(legoName) {
			case 'generic.columns':
				newItem.find('.droppable').dragger({
					handle: '.lego-move',
					group: "lego",
					placeholderClass: 'placeholder',
					notAllow: '[data-name="generic.columns"]',
					specialPlaceholder: {
						'[data-name="generic.image"]': '<li><div class="place-image"></div></li>',
						'[data-name="generic.image-gallery"]': '<li><div class="place-image"></div></li>'
					},
					placeholderChangeTimeout: {
						'[data-name="generic.image"]': 2000,
						'[data-name="generic.image-gallery"]': 0
					},
					onAdd: appendLego,
					onUpdate: saveConfig,
					onStart: dragStart,
					onEnd: dragEnd
				});
			break;
			case 'generic.group':
				newItem.find('.droppable').dragger({
					handle: '.lego-move',
					group: "lego",
					placeholderClass: 'placeholder',
					notAllow: '[data-name="generic.group"]',
					specialPlaceholder: {
						'[data-name="generic.image"]': '<li><div class="place-image"></div></li>',
						'[data-name="generic.image-gallery"]': '<li><div class="place-image"></div></li>'
					},
					placeholderChangeTimeout: {
						'[data-name="generic.image"]': 2000,
						'[data-name="generic.image-gallery"]': 0
					},
					onAdd: appendLego,
					onUpdate: saveConfig,
					onStart: dragStart,
					onEnd: dragEnd
				});
			break;
			default:
			break;
		}
	}

	function saveConfig() {
		console.log('save')
	}

	function makeDnd() {

		$('.toolbar-category-container').dragger({
			draggable: 'li',
			group: "lego",
			placeholderClass: 'placeholder',
			dragOnly: true,
			specialPlaceholder: {
				'[data-name="generic.image"]': '<li><div class="place-image"></div></li>',
				'[data-name="generic.image-gallery"]': '<li><div class="place-image"></div></li>'
			},
			placeholderChangeTimeout: {
				'[data-name="generic.image"]': 2000,
				'[data-name="generic.image-gallery"]': 0
			},
			onStart: dragStart,
			onEnd: dragEnd
		});

		var doc = frameWin.length ? frameDoc : 'body';

		$(doc).find('.droppable').dragger({
			handle: '.lego-move',
			group: "lego",
			placeholderClass: 'placeholder',
			// notAllow: '[data-name="generic.columns"]',
			specialPlaceholder: {
				'[data-name="generic.image"]': '<li><div class="place-image"></div></li>',
				'[data-name="generic.image-gallery"]': '<li><div class="place-image"></div></li>'
			},
			placeholderChangeTimeout: {
				'[data-name="generic.image"]': 2000,
				'[data-name="generic.image-gallery"]': 0
			},
			onAdd: appendLego,
			onUpdate: saveConfig,
			onStart: dragStart,
			onEnd: dragEnd
		});
	}

	if (frameWin.length) {
		frameWin.on("load", makeDnd);
	} else {
		makeDnd();
	}

})();

(function() {
	
	'use strict';

	window.slog = function(v) {
		$("#log").val($("#log").val() + v + "\n");
	};

	// $('li').on('mousedown', function() {
	// 	console.log(1);
	// })

})();