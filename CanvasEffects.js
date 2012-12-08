(function(window,document){
	var CanvasEffects = function(canvas){
		//Setup the canvas first
		canvas = canvas || document.createElement('canvas');
		this.processCanvas = canvas;
		this.processCtx = this.processCanvas.getContext('2d');
		//For convolution effect
		this.tmpCanvas = document.createElement('canvas');
		this.tmpCtx = this.tmpCanvas.getContext('2d');
		//Utility function
		this.getContext = function(){
			return this.processCtx;
		};
		//CanvasEffects.prototype.luminance - get visually correct brightness from given RGB data
		this.luminance = function(r,g,b){
			return 0.2126*r + 0.7152*g + 0.0722*b;
		};
		//CanvasEffects.prototype.createImageData - get blank image data
		this.createImageData = function(w,h){
			return this.tmpCtx.createImageData(w,h);
		};
		//CanvasEffects.prototype.rgbToHsl - converts RGB colour space to HSL colour space
		this.rgbToHsl = function(r, g, b){
			r /= 255, g /= 255, b /= 255;
			var max = Math.max(r, g, b), min = Math.min(r, g, b);
			var h, s, l = (max + min) / 2;
			
			if(max == min){
				h = s = 0; //achromatic
			}
			else
			{
				var d = max - min;
				s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
				switch(max){
					case r: h = (g - b) / d + (g < b ? 6 : 0); break;
					case g: h = (b - r) / d + 2; break;
					case b: h = (r - g) / d + 4; break;
				}
			}
			h /= 6;
			return [h,s,l];
		};
		//CanvasEffects.prototype.hslToRgb - converts HSL colour space to RGB colour space
		this.hslToRgb = function(h, s, l){
			var r, g, b;
			if(s == 0)
			{
				r = g = b = l; //achromatic
			}
			else
			{
				function hue2rgb(p, q, t){
					if(t < 0) t += 1;
					if(t > 1) t -= 1;
					if(t < 1/6) return p + (q - p) * 6 * t;
					if(t < 1/2) return q;
					if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
					return p;
				}
				
				var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
				var p = 2 * l - q;
				r = hue2rgb(p, q, h + 1/3);
				g = hue2rgb(p, q, h);
				b = hue2rgb(p, q, h - 1/3);
			}
			return [r * 255, g * 255, b * 255];
		};
		//Effects defination starts here
		//CanvasEffects.prototype.convolute - convolutes the image
		this.convolute = function(weights,offset,opaque){
			var pixels = this.processCtx.getImageData(0,0,this.processCanvas.width,this.processCanvas.height);
			var side = Math.round(Math.sqrt(weights.length));
			var halfSide = Math.floor(side/2);
			var src = pixels.data;
			var sw = pixels.width;
			var sh = pixels.height;
			//pad output by the convolution matrix
			var w = sw;
			var h = sh;
			var output = this.createImageData(w, h);
			var dst = output.data;
			//go through the destination image pixels
			var alphaFac = opaque ? 1 : 0;
			for(var y=0; y<h; y++){
				for(var x=0; x<w; x++){
					var sy = y;
					var sx = x;
					var dstOff = (y*w+x)*4;
					//calculate the weighed sum of the source image pixels that
					//fall under the convolution matrix
					var r=0, g=0, b=0, a=0;
					for(var cy=0; cy<side; cy++){
						for(var cx=0; cx<side; cx++){
							var scy = sy + cy - halfSide;
							var scx = sx + cx - halfSide;
							if(scy >= 0 && scy < sh && scx >= 0 && scx < sw){
								var srcOff = (scy*sw+scx)*4;
								var wt = weights[cy*side+cx];
								r += src[srcOff] * wt;
								g += src[srcOff+1] * wt;
								b += src[srcOff+2] * wt;
								a += src[srcOff+3] * wt;
							}
						}
					}
					dst[dstOff] = offset+r;
					dst[dstOff+1] = offset+g;
					dst[dstOff+2] = offset+b;
					dst[dstOff+3] = a + alphaFac*(255-a);
				}
			}
			this.processCtx.clearRect(0,0,this.processCanvas.width,this.processCanvas.height);
			this.processCtx.putImageData(output,0,0);
			return this;
		};
		//CanvasEffects.prototype.sepia - turns image sepia
		this.sepia = function(mix){
			mix = mix ? mix : 1;
			mix = Math.min(mix,1);
			mix = 255 * mix;
			var pixels = this.processCtx.getImageData(0,0,this.processCanvas.width,this.processCanvas.height);
			var data = pixels.data;
			for(var i = 0; i < data.length; i+=4){
				data[i] = 0.393*data[i] + 0.769*data[i+1] + 0.189*data[i+2];
				data[i+1] = 0.349*data[i] + 0.686*data[i+1] + 0.168*data[i+2];
				data[i+2] = 0.272*data[i] + 0.534*data[i+1] + 0.131*data[i+2];
				data[i+3] = mix;
			}
			pixels.data = data;
			this.processCtx.putImageData(pixels,0,0);
			return this;
		};
		//CanvasEffects.prototype.greyscale - turns image greyscale
		this.greyscale = function(){
			var pixels = this.processCtx.getImageData(0,0,this.processCanvas.width,this.processCanvas.height);
			var data = pixels.data;
			for(var i = 0; i < data.length; i+=4){
				data[i] = data[i+1] = data[i+2] = this.luminance(data[i],data[i+1],data[i+2]);
			}
			pixels.data = data;
			this.processCtx.putImageData(pixels,0,0);
			return this;
		};
		//CanvasEffects.prototype.invert - inverte the colour of the image
		this.invert = function(){
			var pixels = this.processCtx.getImageData(0,0,this.processCanvas.width,this.processCanvas.height);
			var data = pixels.data;
			for(var i = 0; i < data.length; i+=4){
				data[i] = 255-data[i];
				data[i+1] = 255-data[i+2];
				data[i+2] = 255-data[i+2];
			}
			pixels.data = data;
			this.processCtx.putImageData(pixels,0,0);
			return this;
		};
		//CanvasEffects.prototype.hue - adjust the hue of the image
		this.hue = function(hue,colorize){
			var pixels = this.processCtx.getImageData(0,0,this.processCanvas.width,this.processCanvas.height);
			var data = pixels.data;
			var h = hue / 360;
			for(var i = 0; i < data.length; i+=4){
				var hsl = this.rgbToHsl(data[i],data[i+1],data[i+2]);
				hsl[0] = colorize ? h : hsl[0] + h;
				var rgb = this.hslToRgb(hsl[0],hsl[1],hsl[2]);
				data[i] = rgb[0];
				data[i+1] = rgb[1];
				data[i+2] = rgb[2];
			}
			pixels.data = data;
			this.processCtx.putImageData(pixels,0,0);
			return this;
		};
		//CanvasEffects.prototype.saturation - adjust the saturation of the image
		this.saturation = function(sat,colorize){
			var pixels = this.processCtx.getImageData(0,0,this.processCanvas.width,this.processCanvas.height);
			var data = pixels.data;
			var h = sat / 100;
			for(var i = 0; i < data.length; i+=4){
				var hsl = this.rgbToHsl(data[i],data[i+1],data[i+2]);
				hsl[1] = colorize ? h : hsl[1] + h;
				var rgb = this.hslToRgb(hsl[0],hsl[1],hsl[2]);
				data[i] = rgb[0];
				data[i+1] = rgb[1];
				data[i+2] = rgb[2];
			}
			pixels.data = data;
			this.processCtx.putImageData(pixels,0,0);
			return this;
		};
		//CanvasEffects.prototype.saturation - adjust the saturation of the image
		this.lightness = function(light,colorize){
			var pixels = this.processCtx.getImageData(0,0,this.processCanvas.width,this.processCanvas.height);
			var data = pixels.data;
			var h = light / 100;
			for(var i = 0; i < data.length; i+=4){
				var hsl = this.rgbToHsl(data[i],data[i+1],data[i+2]);
				hsl[2] = colorize ? h : hsl[2] + h;
				var rgb = this.hslToRgb(hsl[0],hsl[1],hsl[2]);
				data[i] = rgb[0];
				data[i+1] = rgb[1];
				data[i+2] = rgb[2];
			}
			pixels.data = data;
			this.processCtx.putImageData(pixels,0,0);
			return this;
		};
		//CanvasEffects.prototype.findEdges - apply a find edge matrix
		this.findEdges = function(){
			this.convolute([
				-1,0,1,
				-2,0,2,
				-1,0,1
			],0,true);
			return this;
		};
		//CanvasEffects.prototype.emboss - emboss the image
		this.emboss = function(){
			this.convolute([
				2,0,0,
				0,-1,0,
				0,0,-1
			],127,true);
			return this;
		};
		//CanvasEffects.prototype.blur - blur the image
		this.blur = function(){
			this.convolute([
				1/9,1/9,1/9,
				1/9,1/9,1/9,
				1/9,1/9,1/9
			],0,true);
			return this;
		};
		//CanvasEffects.prototype.sharpen - sharpen the image
		this.sharpen = function(){
			this.convolute([
				0,-1,0,
				-1,5,-1,
				0,-1,0
			],0,true);
			return this;
		};
		//CanvasEffects.prototype.highlightEdges - hightlight the edges the image
		this.highlightEdges = function(){
			this.convolute([
				0.5,1,0.5,
				1,-5,1,
				0.5,1,0.5
			],0,true);
			return this;
		};
		//Effects definations ends here
	};
	
	//Make it global
	window['CanvasEffects'] = CanvasEffects;
})(window,document);