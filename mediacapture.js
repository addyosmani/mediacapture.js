(function(global){
	var dev = navigator.device, ui = {},
		BlobBuilder = global.WebKitBlobBuilder || global.MozBlobBuilder || global.BlobBuilder,
		FileReader = global.WebKitFileReader || global.MozFileReader || global.FileReader
		URL = global.webkitURL || global.MozURL || global.URL;

	function toObjectURL(contentType, bdata) {
		return URL.createObjectURL(toBlob(contentType, bdata));		
	}

	function toBlob(contentType, data) {
		var blob = {};
		if (BlobBuilder) {
			var bdata = window.atob(data), 
				ui8a = new Uint8Array(bdata.length);    	
			for (var i = 0; i < ui8a.length; ++i) { 
				ui8a[i] = bdata.charCodeAt(i);
			}

			var bb = new BlobBuilder();    	
			bb.append(ui8a.buffer);
			blob = bb.getBlob(contentType);
		}
		blob.data = data;
		return blob;
	}

	function toDataURL(contentType, dataStr) {	
		return 'data:' + contentType + ';base64,' + dataStr;
	}

	dev = {
		load: function(cb){			
			var object = document.createElement("div"), 
				wrapper = document.createElement("div"),
				menu = document.createElement("div"),
				closeBtn = document.createElement("div");
			
			closeBtn.className = "mc-close-button";
			closeBtn.innerHTML = "&Cross;";
			object.id = "mc-flashobject";
			wrapper.className = "mc-wrapper";
			menu.className = "mc-menu";

			wrapper.appendChild(closeBtn);
			wrapper.appendChild(object);
			wrapper.appendChild(menu);
						
			document.body.appendChild(wrapper);
			wrapper.style.left = (window.innerWidth/2 - this.width/2).toString() + "px";
			wrapper.style.top = (window.innerHeight/2 - this.height/2).toString() + "px";

			this.flashElement = object;			
			this.callback = cb;			
			var self = this;

			swfobject.embedSWF(
				this.swf,
				this.flashElement.id,
				"320",
				"240",
				"10.1.0",
			    null,
			    null,
			    { quality:'high', bgcolor: "#ffffff", allowscriptaccess: "sameDomain" },
			    null,
			    function(e) {
			        self.flashElement = e.ref;
			        self.flashWrapper = e.ref.parentNode;
			        self.flashWrapper.style.display = "inline-block";
			        if (self.callback) {
			        	setTimeout(function(){
				        	self.callback();
				    	}, 200); // Wait until flash is loaded
				    }
			    }
			);
	

			return object;		
		},

		initialized: false,
		FLASH_SIZE_WITHOUT_PERMISSION: 60,
		width: 400,
		height: 310,
		callback: null,

		flashWrapper: null,
		flashElement: null,
		
		swf: "MediaCapture.swf"
	}

	//dev.load();

	ui = {
		css : {
			stylesheet: (function(){
				var link = document.createElement("link");
				link.setAttribute("rel", "stylesheet");
				link.setAttribute("href", "mediacapture.css");
				link.setAttribute("id", "mc-style");
				document.head.appendChild(link);
				return link;
			})(),
			show: "inline-block",
			hide: "none",
		},

		captureBtn: {
			element: null,
			display: true,
		},

		stopBtn: {
			element: null,
			display: true
		},

		menu: null,

		toggleCaptureBtn: function(){

			this.captureBtn.element.style.display =  this.captureBtn.display ? this.css.hide : this.css.show;
			this.captureBtn.display = !this.captureBtn.display;
		},

		toggleStopBtn: function(){

			this.stopBtn.element.style.display = this.stopBtn.display ? this.css.hide : this.css.show;
			this.stopBtn.display = !this.stopBtn.display;
		},

		show: function(captureCb, stopCb) {
			dev.flashWrapper.style.visibility = "visible";
			var menu = dev.flashWrapper.querySelector(".mc-menu");
			menu.innerHTML = "<button class='mc-button mc-capture'>Capture</button><button class='mc-button mc-stop'>Stop</button>";

			var captureBtn = menu.querySelector(".mc-capture"),
				stopBtn = menu.querySelector(".mc-stop");


			captureBtn.style.display = ui.css.show;
			stopBtn.style.display = ui.css.show;

			captureBtn.addEventListener("click", function(event){
				captureCb();
			}, false);

			stopBtn.addEventListener("click",function(event){
				stopCb();
			}, false);

			ui.menu = menu;
			ui.captureBtn.element = captureBtn;
			ui.stopBtn.element = stopBtn;
			dev.flashWrapper.style.display = this.css.show;
		},

		hide: function() {
			this.menu.innerHTML = "";
			dev.flashWrapper.style.visibility = "hidden";
			document.body.removeChild(dev.flashWrapper);
		}
	}

	function PendingOperation(cancelOp){
		this.cancel = cancelOp;		
	}

	function CaptureError(code){
		this.code = code;		
	}
 	
	CaptureError.CAPTURE_APPLICATION_BUSY = 0;
	CaptureError.CAPTURE_INTERNAL_ERR = 1;
	CaptureError.CAPTURE_INVALID_ARGUMENT = 2;
	CaptureError.CAPTURE_NO_MEDIA_FILES = 3;		

	function CaptureCB(files, callback){
		return callback(files);
	}

	function CaptureErrorCB(error, callback){
		return callback(new CaptureError(error));
	}

	function CaptureAudioOptions(options){
		return  {
			limit: options.limit || 1,
			duration: options.duration || 0
		}
	}

	function CaptureImageOptions(options){
		return  {
			limit: options.limit || 1,
			width: options.width,
			height: options.height,
			format: options.format
		}
	}

	function CaptureVideoOptions(options){
		return  {
			limit: options.limit || 1,
			duration: options.duration || 0
		}
	}

	function MediaFileData(codecs, bitrate, height, width, duration){
		this.codecs = codecs;
		this.bitrate = bitrate;
		this.height = height;
		this.width = width;
		this.duration = duration;
	}

	function ImageMediaFileData(codecs, height, width){
		return new MediaFileData(codecs, 0, height, width, 0);
	}

	function VideoMediaFileData(codecs, height, width, duration){
		return new MediaFileData(codecs, 0, height, width, duration);
	}

	function AudioMediaFileData(codecs, bitrate, duration){
		return new MediaFileData(codecs, bitrate, 0, 0, duration);
	}

	function captureAudio(success, error, options){
		var pending = new PendingOperation(null), options = options || {};
		dev.load( function() {


		global.__mediacapture_audioerror = function(code){
			CaptureErrorCB(code, error);
		}

		global.__mediacapture_audiocomplete = function(audio){						
			var file = toBlob("audio/wav", audio);
			if (file.size == dev.FLASH_SIZE_WITHOUT_PERMISSION) {
				return CaptureErrorCB(CaptureError.CAPTURE_NO_MEDIA_FILES, error);
			}
			

			CaptureCB(file, success);
		}

		options = CaptureAudioOptions(options || {});
		dev.flashElement.initMicrophone(options.limit, options.duration);

		function record(){ 
			dev.flashElement.captureAudio();

			ui.toggleCaptureBtn();
		}

		function cancel(){
			dev.flashElement.cancelAudio();

			ui.toggleCaptureBtn();
			ui.toggleStopBtn();

			--options.limit;
			if (options.limit == 0) {
				ui.hide();				
			}
		}

		ui.show(record, cancel);			
		pending.cancel =  dev.flashElement.cancelAudio;
		return pending;

		});

		return pending;
	}

	function captureImage(success, error, options){
		var pending = {}, options = options || {};;
		dev.load( function() {

		var codec = options.codec || "jpeg";

		global.__mediacapture_cameraerror = function(code){
			CaptureErrorCB(code, error);
		}

		global.__mediacapture_cameracomplete = function(frame){						
			var file = toBlob("image/"+codec, frame);
			CaptureCB(file, success);
		}

		
		options = CaptureImageOptions(options || {});
		dev.flashElement.initCamera(options.limit, options.duration);

		function takePicture(){
			dev.flashElement.captureImage(codec);
			
			--options.limit;
			if (options.limit == 0) {
				ui.hide();				
			}
		}

		function cancel(){
			dev.flashElement.cancelVideo();
		}

		ui.show(takePicture, cancel);
		pending.cancel =  dev.flashElement.cancelVideo;
		return pending;

		});
		return pending;
	}
	
	// 'XXX' - Flash is unable to record videos locally
	function captureVideo(success, error, options){}

	/*
	 * HTML Media Capture API
	 * 
	 * http://www.w3.org/TR/media-capture-api/
	 * 
	 * 'XXX' - Assert media formats available for browser vendors
	 */
	var imageCodecs = ["png", "jpeg", "jpg"], 
		imageFormats = [ 
		new ImageMediaFileData(imageCodecs[0], 640, 480), 
		new ImageMediaFileData(imageCodecs[1], 640, 480),
		new ImageMediaFileData(imageCodecs[2], 640, 480)
	], audioFormats = [
		new AudioMediaFileData("wav", 0,0), 
	]

	navigator.device = {
		supportedImageFormats: imageFormats,
		supportedAudioFormats: audioFormats,

		captureImage: captureImage,
		captureAudio: captureAudio,

		captureVideo: undefined,
	}




	/*
	 * HTML Media Capture form handling
	 * 
	 * http://www.w3.org/TR/html-media-capture/
	 *
	 */
	function isCodecValid(supported, codec){		
		for (var i=0;i<supported.length; ++i) {
			if ( supported.indexOf(supported[i].codecs) ) {
				return true;
			}
		}

		return false;		
	}

	function capture(device, type, codec, element){		
		function savePicture(blob){			
			var img = document.createElement("img");  
      		//img.src = toDataURL("image/"+codec, blob.data);      		
      		if (BlobBuilder && URL) {
      			img.src = URL.createObjectURL(blob);
      			img.addEventListener("load", function(evt){  			
					URL.revokeObjectURL(this.src);
      			}, false);
      		} else {
      			img.src = toDataURL("image/"+codec, blob.data);
      		}
      			      			
			element.parentNode.appendChild(img);

		}

		function saveAudio(blob){
			var audio = document.createElement("audio");  
			if (BlobBuilder && URL) {
    			audio.src = URL.createObjectURL(blob);
    			URL.revokeObjectURL(this.src);	
    		} else {
    			audio.src = toDataURL("audio/"+codec, blob.data);    			
    		}
    		
    		audio.autoplay = "autoplay";
    		audio.controls = "controls";

			element.parentNode.appendChild(audio);			
		}

		if (device == "camera" && type == "image" && isCodecValid(imageFormats, codec)) {
			captureImage(savePicture, function(code){}, { codec: codec });
		} else if (device == "microphone" && type == "audio" && isCodecValid(imageFormats, codec)) {
			captureAudio(saveAudio, function(code){});
		} else if (device == "camcorder") {			
			return false; // 
		} else {
			return false;
		}

		return true;
	}

	var elements = document.querySelectorAll("input[type='file'][accept][capture]"); // File inputs with capture

	for(var i=0; i<elements.length; ++i){
		elements[i].addEventListener("click", function(evt){
			var element = evt.target,
				tokens = element.getAttribute("accept").split("/"),
				capt = element.getAttribute("capture");

			if (capture(capt, tokens[0], tokens[1], element)) {
				evt.preventDefault();
				return false;
			}			
		}, false);
	}

})(window);