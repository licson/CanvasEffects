(function(window){
	//shortcuts to document and math
	var doc = window.document;
	var m = window.Math;
	
	//little function for extending object
	var extend = function(a,b){
		for(var i in b){
			a[i] = b[i];
		}
	};
	
	//assertion - good for debug
	var assert = function(condition,msg){
		msg = msg || '';
		if(!condition){
			throw new Error(msg);
		}
	};
	
	//our main constructor
	var fx = function(canvas,opts){
		//check if the given element is a canvas element
		assert(canvas.nodeName.toLowerCase() === "canvas","A canvas element is excepted.");
		
		var _opts = {
			width:canvas.width,
			height:canvas.height,
			useWorker:typeof Worker === "function",
			workerPath:'CanvasEffects.worker.js'
		};
		extend(_opts,opts);
		
		//cache the width and height
		this.width = _opts.width;
		this.height = _opts.height;
		
		//create the canvas context we need
		var tmpCanvas = doc.createElement('canvas');
		tmpCanvas.width = this.width;
		tmpCanvas.height = this.height;
		this.ctx = canvas.getContext('2d');
		this.tmpCtx = tmpCanvas.getContext('2d');
		
		//setup the worker
		if(_opts.useWorker){
			var self = this;
			this._queue = [];
			this.worker = new Worker(_opts.workerPath);
			this.worker.onmessage = function(e){
				var output = self.createImageData(self.width,self.height);
				
				//This is a hack for IE10
				//because they don't have support for Uint8ClampedArray
				//and we need to copy the data maunally
				if(typeof Uint8ClampedArray === "undefined"){
					for(var i = 0; i < e.data.length; i++){
						output.data[i] = e.data[i];
					}
				}
				else {
					output.data.set(e.data);
				}
				
				//execute the queue
				for(var i = 0; i < self._queue.length; i++){
					output.data = self._queue[i](output.data);
				}
				//reset the queue
				self._queue = [];
				
				self.ctx.clearRect(0,0,self.width,self.height);
				self.ctx.putImageData(output,0,0);
			};
			this.worker.postMessage({
				type:'init',
				w:this.width,
				h:this.height
			});
		}
	};
	
	//Utility functions
	extend(fx.prototype,{
		load:function(url,resize){
			resize = resize || true;
			var img = new Image();
			var self = this;
			img.onload = function(){
				if(resize){
					self.ctx.drawImage(this,0,0,this.width,this.height,0,0,self.width,self.height);
					self.tmpCtx.drawImage(this,0,0,this.width,this.height,0,0,self.width,self.height);
				}
				else {
					self.ctx.drawImage(this,0,0,this.width,this.height);
					self.tmpCtx.drawImage(this,0,0,this.width,this.height);
				}
			};
			img.crossOrigin = true;
			img.src = url;
			return this
		},
		restore:function(){
			this.ctx.clearRect(0,0,this.width,this.height);
			this.ctx.drawImage(this.tmpCtx.canvas,0,0,this.width,this.height);
			return this;
		},
		save:function(){
			this.tmpCtx.clearRect(0,0,this.width,this.height);
			this.tmpCtx.drawImage(this.ctx.canvas,0,0,this.width,this.height);
		},
		toDataURL:function(){
			return this.ctx.canvas.toDataURL();
		},
		process:function(func){
			var pix = this.ctx.getImageData(0,0,this.width,this.height);
			for(var x = 0; x < this.width; x++){
				for(var y = 0; y < this.height; y++){
					var i = (y*this.width+x)*4;
					var r = pix.data[i], g = pix.data[i+1], b = pix.data[i+2], a = pix.data[i+3];
					var ret = func(r,g,b,a,x,y);
					pix.data[i] = ret[0];
					pix.data[i+1] = ret[1];
					pix.data[i+2] = ret[2];
					pix.data[i+3] = ret[3];
				}
			}
			this.ctx.clearRect(0,0,this.width,this.height);
			this.ctx.putImageData(pix,0,0);
			return this;
		},
		getContext:function(){
			return this.ctx;
		},
		luminance:function(r,g,b){
			return 0.2126*r + 0.7152*g + 0.0722*b;
		},
		createImageData:function(w,h){
			return this.tmpCtx.createImageData(w,h);
		},
		toHSL:function(r,g,b){
			r /= 255;
			g /= 255;
			b /= 255;
			var max = m.max(r,g,b);
			var min = m.min(r,g,b);
			var h, s, l = (max+min)/2;
			
			if(max === min){
				h = s = 0;
			}
			else {
				var d = max - min;
				s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
				switch(max){
					case r:
					h = (g - b) / d + (g < b ? 6 : 0);
					break;
					
					case g:
					h = (b - r) / d + 2;
					break;
					
					case b:
					h = (r - g) / d + 4;
					break;
				}
			}
			h /= 6;
			return {
				h:h,
				s:s,
				l:l
			};
		},
		toRGB:function(h,s,l){
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
			return {
				r:r*255,
				g:g*255,
				b:b*255
			};
		},
		_toWorker:function(params){
			if(this.worker){
				extend(params,{data:this.ctx.getImageData(0,0,this.width,this.height).data});
				this.worker.postMessage(params);
				return this;
			}
			else {
				assert(false,'No web worker support!');
			}
		},
		queue:function(func){
			if(!this.worker){
				var pix = this.ctx.getImageData(0,0,this.width,this.height);
				pix.data = func(pix.data);
				this.ctx.putImageData(pix,0,0);
			}
			else this._queue.push(func);
			return this;
		}
	});
	
	//colour effects
	extend(fx.prototype,{
		greyscale:function(){
			var self = this;
			return this.process(function(r,g,b,a){
				var l = self.luminance(r,g,b);
				return [l,l,l,a];
			});
		},
		threshold:function(threshold){
			threshold = threshold || 127;
			var self = this;
			return this.process(function(r,g,b,a){
				var l = self.luminance(r,g,b) > threshold ? 255: 0;
				return [l,l,l,a];
			});
		},
		invert:function(){
			return this.process(function(r,g,b,a){
				return [255-r,255-g,255-b,a];
			});
		},
		sepia:function(mix){
			mix = m.max(m.min(mix||1,1),0);
			return this.process(function(r,g,b,a){
				var nr = (0.393 * r + 0.769 * g + 0.189 * b) * mix + r * (1 - mix);
				var ng = (0.349 * r + 0.686 * g + 0.168 * b) * mix + g * (1 - mix);
				var nb = (0.272 * r + 0.534 * g + 0.131 * b) * mix + b * (1 - mix);
				return [nr,ng,nb,a];
			});
		}
	});
	
	//special effects
	extend(fx.prototype,{
		noise:function(amt,alphanoise){
			assert(amt >= 0,"Noise amount must be a positive number.");
			alphanoise = alphanoise || false;
			return this.process(function(r,g,b,a){
				var noise = -amt/2 + m.random() * amt * 2;
				return [r+noise,g+noise,b+noise,alphanoise ? a + noise : a];
			});
		},
		glow:function(radius){
			var self = this;
			this.blur(radius);
			return this.queue(function(data){
				var orig = self.ctx.getImageData(0,0,self.width,self.height);
				for(var i = 0; i < data.length; i += 4){
					data[i] = 255 - (((255 - data[i]) * (255 - orig.data[i])) / 255);
					data[i+1] = 255 - (((255 - data[i+1]) * (255 - orig.data[i+1])) / 255);
					data[i+2] = 255 - (((255 - data[i+2]) * (255 - orig.data[i+2])) / 255);
					data[i+3] = 255 - (((255 - data[i+3]) * (255 - orig.data[i+3])) / 255);
				}
				return data;
			});
		},
		colorMatrix:function(matrix){
			return this.process(function(r,g,b,a){
				r = r * matrix[0] + g * matrix[1] + b * matrix[2] + a * matrix[3] + 255 * matrix[20];
				g = r * matrix[5] + g * matrix[6] + b * matrix[7] + a * matrix[8] + 255 * matrix[21];
				b = r * matrix[10] + g * matrix[11] + b * matrix[12] + a * matrix[13] + 255 * matrix[22];
				a = r * matrix[15] + g * matrix[16] + b * matrix[17] + a * matrix[18] + 255 * matrix[23];
				return [r,g,b,a];
			});
		}
	});
	
	//adjustments
	extend(fx.prototype,{
		hue:function(hue,colorize){
			assert(hue !== undefined,"Hue must be specified.")
			var self = this;
			colorize = colorize || false;
			return this.process(function(r,g,b,a){
				var hsl = self.toHSL(r,g,b);
				if(colorize){
					hsl.h = hue / 360;
				}
				else {
					hsl.h = hsl.h + hue / 360;
				}
				var rgb = self.toRGB(hsl.h,hsl.s,hsl.l);
				return [rgb.r,rgb.g,rgb.b,a];
			});
		},
		saturation:function(sat,colorize){
			assert(sat !== undefined,"Saturation must be specified.")
			var self = this;
			colorize = colorize || false;
			return this.process(function(r,g,b,a){
				var hsl = self.toHSL(r,g,b);
				if(colorize){
					hsl.s = sat;
				}
				else {
					hsl.s = hsl.s + sat;
				}
				var rgb = self.toRGB(hsl.h,hsl.s,hsl.l);
				return [rgb.r,rgb.g,rgb.b,a];
			});
		},
		brightness:function(brightness){
			assert(brightness !== undefined,"Brightness must be set");
			return this.process(function(r,g,b,a){
				return [r+brightness,g+brightness,b+brightness,a];
			});
		},
		contrast:function(level){
			assert(level !== undefined,"Contrast level must be set.");
			var self = this;
			level = m.pow((level+100)/100,2);
			return this.process(function(r,g,b,a){
				return [((r/255-0.5)*level+0.5)*255,((g/255-0.5)*level+0.5)*255,((b/255-0.5)*level+0.5)*255,a];
			});
		},
		gamma:function(gamma){
			assert(gamma !== undefined,"Gamma level must be set.");
			return this.process(function(r,g,b,a){
				return [r*gamma,g*gamma,b*gamma,a];
			});
		},
		gammaRGB:function(lr,lg,lb){
			assert(lr !== undefined && lg !== undefined && lb !== undefined,"Gamma level must be set.");
			return this.process(function(r,g,b,a){
				return [r*lr,g*lg,b*lb,a];
			});
		},
		vibrance:function(level){
			assert(level !== undefined,"Vibrance level must be set.");
			level *= -1;
			return this.process(function(r,g,b,a){
				var max = m.max(r,g,b), avg = (r+g+b)/3, amt = ((m.abs(max - avg) * 2 / 255) * level) / 100;
				if(r !== max){
					r += (max - r) * amt;
				}
				if(g !== max){
					g += (max - g) * amt;
				}
				if(b !== max){
					b += (max - b) * amt;
				}
				return [r,g,b,a];
			});
		}
	});
	
	//convolution effects
	extend(fx.prototype,{
		convolute:function(weights,offset,opaque){
			assert(weights !== undefined,"Convolution matrix must be set.");
			assert(offset !== undefined,"Offset must be set.");
			opaque = opaque || true;

			if(this.worker){
				this._toWorker({
					type:'convolute',
					matrix:weights,
					offset:offset,
					opaque:opaque
				});
			}
			else {
				var pixels = this.ctx.getImageData(0,0,this.width,this.height);
				var side = m.round(m.sqrt(weights.length));
				var halfSide = m.floor(side/2);
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
				this.ctx.clearRect(0,0,this.width,this.height);
				this.ctx.putImageData(output,0,0);
			}
			return this;
		},
		blur:function(level){
			assert(level !== undefined,"Blur radius must be set.");
			var len = level*level;
			var val = 1/len;
			var matrix = [];
			if(len < 4){
				//if the length of the matrix is less than 4,
				//it means that the blur radius is less than 2. There's no need to blur.
				return this;
			}
			//Fill up our convolution matrix with values
			while(len--){
				matrix.push(val);
			}
			return this.convolute(matrix,0,true);
		},
		sharpen:function(){
			return this.convolute([0,-1,0,-1,5,-1,0,-1,0],0,true);
		},
		emboss:function(){
			return this.convolute([2,0,0,0,-1,0,0,0,-1],127,true);
		},
		findEdges:function(){
			return this.convolute([-1,0,1,-2,0,2,-1,0,1],0,true);
		}
	});
	
	window['CanvasEffects'] = fx;
})(window);