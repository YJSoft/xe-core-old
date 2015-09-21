function getCkFormInstance(editor_sequence)
{
    var fo_obj = document.getElementById('ckeditor_instance_' + editor_sequence).parentNode;
    while(fo_obj.nodeName != 'FORM') { fo_obj = fo_obj.parentNode; }
    if(fo_obj.nodeName == 'FORM') return fo_obj;
    return;
}

(function($){
	"use strict";
	var default_ckeconfig = {
		bodyClass: 'xe_content editable',
		toolbarCanCollapse: true,
		toolbarGroups: [
			{ name: 'clipboard',   groups: [ 'undo', 'clipboard' ] },
			{ name: 'editing',     groups: [ 'find', 'selection' ] },
			{ name: 'links' },
			{ name: 'insert' },
			{ name: 'tools' },
			{ name: 'document',    groups: [ 'mode' ] },
			'/',
			{ name: 'basicstyles', groups: [ 'basicstyles', 'cleanup' ] },
			{ name: 'paragraph',   groups: [ 'list', 'indent', 'blocks', 'align', 'bidi' ] },
			'/',
			{ name: 'styles' },
			{ name: 'colors' },
			{ name: 'xecomponent' },
			{ name: 'others' }
		],
		allowedContent: true,
		removePlugins: 'stylescombo,language,bidi,flash,pagebreak',
		removeButtons: 'Save,Preview,Print,Cut,Copy,Paste',
		uiColor: '#EFF0F0'
	};

	function arrayUnique(data) {
		return $.grep(data, function(v, k){
			return (v.length && $.inArray(v, data) === k);
		});
	}

	var XeCkEditor = xe.createApp('XeCkEditor', {
		ckeconfig: {},
		editor_sequence: null,
		init : function() {
			var self = this;

			CKEDITOR.on('instanceCreated', function(evt){
				self.cast('CKEDITOR_CREATED');
			});

			CKEDITOR.on('ready', function(evt){
				self.cast('CKEDITOR_READY');
			});

			CKEDITOR.on('instanceReady', function(evt){
				self.cast('CKEDITOR_INSTANCE_READY');
			});

			CKEDITOR.on('instanceLoaded', function(evt){
				self.cast('CKEDITOR_LOADED');
			});
		},
		editorInit : function(containerEl, opts) {
			var self = this;
			var $containerEl = containerEl;
			var $form     = $containerEl.closest('form');
			var $contentField = $form.find(opts.content_field);
			var data = $containerEl.data();
			var editor_sequence = $containerEl.data().editorSequence;
            var primary_key = $containerEl.data().editorPrimaryKeyName;
            var fo_obj = getCkFormInstance(editor_sequence);

			this.ckeconfig = $.extend({}, default_ckeconfig, opts.ckeconfig || {});

			this.editor_sequence = data.editorSequence;
			$form.attr('editor_sequence', data.editorSequence);

			if(CKEDITOR.env.mobile) CKEDITOR.env.isCompatible = true;

			var instance = CKEDITOR.appendTo($containerEl[0], {}, $contentField.val());

			instance.on('customConfigLoaded', function(e) {
				instance.config = $.extend({}, e.editor.config, self.ckeconfig);

				if($.isFunction(CKEDITOR.editorConfig)) {
					var customConfig = {};
					CKEDITOR.editorConfig(customConfig);

					$.each(customConfig, function(key, val) {
						instance.config[key] = val;
					});
				}

				var bodyClass = e.editor.config.bodyClass.split(' ');
				bodyClass.push(default_ckeconfig.bodyClass);
				bodyClass = arrayUnique(bodyClass);
				instance.config.bodyClass = bodyClass.join(' ');

				if(opts.loadXeComponent) {
					var extraPlugins = e.editor.config.extraPlugins.split(',');

					extraPlugins.push('xe_component');
					extraPlugins = arrayUnique(extraPlugins);
					instance.config.extraPlugins = extraPlugins.join(',');
				}

				if(!opts.enableToolbar) instance.config.toolbar = [];
			});

            instance.on( 'fileUploadRequest', function( evt ) {
                var fileLoader = evt.data.fileLoader,
                    formData = new FormData(),
                    xhr = fileLoader.xhr;

                xhr.open( 'POST', current_url.setQuery('act','procFileUpload'), true );
                formData.append( 'Filedata', fileLoader.file, fileLoader.fileName );
                formData.append( 'mid', window.current_mid );
                formData.append( 'act', "procFileUpload" );
                formData.append( 'editor_sequence', fileLoader.uploadUrl );
                fileLoader.xhr.send( formData );

                evt.stop();
            }, null, null, 4 );

            instance.on( 'fileUploadResponse', function( evt ) {
                evt.stop();

                var data = evt.data,
                    xhr = data.fileLoader.xhr,
                    response = jQuery.parseJSON(xhr.responseText);

                if ( response.error != 0 ) {
                    // Error occurred during upload.
                    data.message = response.message;
                    evt.cancel();
                } else {
                    data.url = response.download_url;
                    data.fileName = response.source_filename;

                    fo_obj[primary_key].value = response.upload_target_srl;
                    reloadUploader(response.editor_sequence);
                }
            } );

			$containerEl.data('cke_instance', instance);

			window.editorRelKeys[data.editorSequence] = {};
			window.editorRelKeys[data.editorSequence].primary   = $form.find('[name='+data.editorPrimaryKeyName+']')[0];
			window.editorRelKeys[data.editorSequence].content   = $form.find('[name='+data.editorContentKeyName+']')[0];
			window.editorRelKeys[data.editorSequence].func      = function(seq) {
				return self.getContent.call(self, seq);
			};
			window.editorRelKeys[data.editorSequence].pasteHTML = function(text){
				instance.insertHtml(text, 'html');
			};
		},
		getContent : function(seq) {
			var self = this;
			var content = _getCkeInstance(seq).getData();
			self.cast('GET_CONTENT', [content]);

			return content;
		},
		getInstance : function(name) {
			return CKEDITOR.instances[name];
		},
		API_EDITOR_CREATED : function(){
		},
	});

	// Shortcut function in jQuery
	$.fn.XeCkEditor = function(opts) {
		var u = new XeCkEditor(this.eq(0), opts);

		if(u) {
			xe.registerApp(u);
			u.editorInit(this.eq(0), opts);
		}

		return u;
	};

	// Shortcut function in XE
	window.xe.XeCkEditor = function() {
		var u = new XeCkEditor();

		return u;
	};

})(jQuery);
