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
			ghostClass: 'placeholder',
			dragOnly: true,
			onStart: dragStart,
			onEnd: dragEnd
		});

		$('.droppable').dragger({
			handle: '.lego-move',
			group: "lego",
			ghostClass: 'placeholder',
			notAllow: '[data-name="generic.columns"]',
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