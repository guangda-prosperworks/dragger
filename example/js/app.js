(function() {

	'use strict';

	var isNew = true;

	var legoHtml = '<li><span class="lego-move"></span><div class="content"></div></li>'

	function dragStart() {
		$('.droppable').addClass("highlight");
	}

	function dragEnd() {
		$('.droppable').removeClass("highlight");
	}

	function appendLego(evt, item) {
		var newItem = $(legoHtml);

		newItem.find(".content").html(item.data('name').toUpperCase());
		newItem.insertBefore(item);
		newItem.attr('data-name', item.data('name').toLowerCase());
		item.remove();

		saveConfig();
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
				'[data-name="generic.image"]': '<li><div class="place-image"></div></li>'
			},
			onStart: dragStart,
			onEnd: dragEnd
		});

		$('.droppable').dragger({
			handle: '.lego-move',
			group: "lego",
			placeholderClass: 'placeholder',
			notAllow: '[data-name="generic.columns"]',
			specialPlaceholder: {
				'[data-name="generic.image"]': '<li><div class="place-image"></div></li>'
			},
			onAdd: appendLego,
			onUpdate: saveConfig,
			onStart: dragStart,
			onEnd: dragEnd
		});
	}

	makeDnd();

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