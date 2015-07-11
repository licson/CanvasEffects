(function(window) {
	//Shortcuts to document and math
	var doc = window.document;
	var m = window.Math;

	//A little function for extending object
	var extend = function(a, b) {
		for (var i in b) {
			a[i] = b[i];
		}
	};

	//Assertion - good for debug
	var assert = function(condition, msg) {
		msg = msg || '';
		if (!condition) {
			throw new Error(msg);
		}
	};

	//#Class Constructor: CanvasEffects
	//
	//Creates a `CanvasEffects` instance.
	//
	//##Options
	//  - `canvas` : The canvas DOM object for applying effects
	//  - `opts` : Extra Options
	//    - `width` : If set, override the width of the canvas
	//    - `height` : If set, override the height of the canvas
	//    - `useWorker` : Whether to use Web Workers or not. It'll use Web Workers by default if supported. You need to turn this off if you use it to apply effects on animations.
	//    - `workerPath` : The path to the Web Worker script.
	//
	//Example:
	//    var fx = new CanvasEffects(canvas, { useWorker: false });
	//
	var fx = function(canvas, opts) {
		//check if the given element is a canvas element
		assert(canvas.nodeName.toLowerCase() === "canvas", "A canvas element is excepted.");

		var _opts = {
			width: canvas.width,
			height: canvas.height,
			useWorker: typeof Worker === "function",
			workerPath: 'CanvasEffects.worker.js'
		};
		extend(_opts, opts);

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
		if (_opts.useWorker) {
			var self = this;
			this._queue = [];
			this.worker = new Worker(_opts.workerPath);
			this.worker.onmessage = function(e) {
				var output = self.createImageData(self.width, self.height);

				//This is a hack for IE10
				//because they don't have support for Uint8ClampedArray
				//and we need to copy the data maunally
				if (typeof Uint8ClampedArray === "undefined") {
					for (var i = 0; i < e.data.length; i++) {
						output.data[i] = e.data[i];
					}
				} else {
					output.data.set(e.data);
				}

				//execute the queue
				for (var i = 0; i < self._queue.length; i++) {
					output.data = self._queue[i](output.data);
				}
				//reset the queue
				self._queue = [];

				self.ctx.clearRect(0, 0, self.width, self.height);
				self.ctx.putImageData(output, 0, 0);
			};

			this.worker.postMessage({
				type: 'init',
				w: this.width,
				h: this.height
			});
		}
	};

	//Utility functions
	extend(fx.prototype, {
		//#Class Method: load
		//
		//Loads an image to the canvas
		//
		//##Options
		//  - `url` : The image's URL
		//  - `resize` _Optional_ : whether to strecth the image to fit the canvas.
		//  - `cb` : The callback after the image has finished loading.
		load: function(url, resize, cb) {
			//If resize parameter is missing, we swap the variables.
			if (typeof resize == "function") {
				cb = resize;
				resize = true;
			}
			resize = typeof resize !== "undefined" ? resize : true;

			//Create a new inage object
			var img = new Image();
			var self = this;
			img.onload = function() {
				if (resize) {
					self.ctx.drawImage(this, 0, 0, this.width, this.height, 0, 0, self.width, self.height);
					self.tmpCtx.drawImage(this, 0, 0, this.width, this.height, 0, 0, self.width, self.height);
				} else {
					self.ctx.drawImage(this, 0, 0, this.width, this.height);
					self.tmpCtx.drawImage(this, 0, 0, this.width, this.height);
				}
				cb.call(self);
			};
			img.crossOrigin = true;
			img.src = url;
			return this
		},
		//#Class Method: restore
		//
		//Restore the previous saved state
		//
		//##Options
		//  - No options
		restore: function() {
			this.ctx.clearRect(0, 0, this.width, this.height);
			this.ctx.drawImage(this.tmpCtx.canvas, 0, 0, this.width, this.height);
			return this;
		},
		//#Class Method: save
		//
		//Saves the state of the canvas
		//
		//##Options
		//  - No options
		save: function() {
			this.tmpCtx.clearRect(0, 0, this.width, this.height);
			this.tmpCtx.drawImage(this.ctx.canvas, 0, 0, this.width, this.height);
			return this;
		},
		//#Class Method: toDataUrl
		//
		//Snapshots the canvas as a base64-encoded PNG image
		//
		//##Options
		//  - No options
		toDataURL: function() {
			return this.ctx.canvas.toDataURL('image/png');
		},
		//#Class Method: process
		//
		//Process the canvas with custom functions.
		//The function will receive 6 parameters: `r`,`g`,`b`,`a`,`x`,`y`.
		//`r`,`g`,`b`,`a` are the colour values and `x`,`y` are the current pixel position.
		//
		//The function should return an array contain the four colour values in the order of `r`, `g`, `b`, `a`.
		//
		//##Options
		//  - `func` : The processing function
		process: function(func) {
			//Get the pixel values
			var pix = this.ctx.getImageData(0, 0, this.width, this.height);

			//Loop through the pixels
			for (var x = 0; x < this.width; x++) {
				for (var y = 0; y < this.height; y++) {
					var i = (y * this.width + x) * 4;
					var r = pix.data[i],
						g = pix.data[i + 1],
						b = pix.data[i + 2],
						a = pix.data[i + 3];
					var ret = func(r, g, b, a, x, y);
					pix.data[i] = ret[0];
					pix.data[i + 1] = ret[1];
					pix.data[i + 2] = ret[2];
					pix.data[i + 3] = ret[3];
				}
			}

			//Put the image back to the canvas
			this.ctx.clearRect(0, 0, this.width, this.height);
			this.ctx.putImageData(pix, 0, 0);
			return this;
		},
		//#Class Method: getContext
		//
		//Gets the raw canvas context
		//
		//##Options
		//  - No options
		getContext: function() {
			return this.ctx;
		},
		//#Class Method: luminance
		//
		//Calculates the CIE luminance from RGB values
		//
		//##Options
		//  - `r` : The red component
		//  - `g` : The green component
		//  - `b` : The blue component
		luminance: function(r, g, b) {
			return 0.2126 * r + 0.7152 * g + 0.0722 * b;
		},
		//#Class Method: createImageData
		//
		//Creates an empty image
		//
		//##Options
		//  - `w` : The width of the image
		//  - `h` : The height of the image
		createImageData: function(w, h) {
			return this.tmpCtx.createImageData(w, h);
		},
		//#Class Method: toHSL
		//
		//Converts RGB colours to HSL colours
		//
		//##Options
		//  - `r` : The red component
		//  - `g` : The green component
		//  - `b` : The blue component
		toHSL: function(r, g, b) {
			r /= 255;
			g /= 255;
			b /= 255;
			var max = m.max(r, g, b);
			var min = m.min(r, g, b);
			var h, s, l = (max + min) / 2;

			if (max === min) {
				h = s = 0;
			} else {
				var d = max - min;
				s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
				switch (max) {
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
				h: h,
				s: s,
				l: l
			};
		},
		//#Class Method: toRGB
		//
		//Converts HSL colours to RGB colours
		//
		//##Options
		//  - `h` : The hue
		//  - `s` : The saturation
		//  - `l` : The lightness
		toRGB: function(h, s, l) {
			var r, g, b;
			if (s == 0) {
				r = g = b = l; //achromatic
			} else {
				function hue2rgb(p, q, t) {
					if (t < 0) t += 1;
					if (t > 1) t -= 1;
					if (t < 1 / 6) return p + (q - p) * 6 * t;
					if (t < 1 / 2) return q;
					if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
					return p;
				}

				var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
				var p = 2 * l - q;
				r = hue2rgb(p, q, h + 1 / 3);
				g = hue2rgb(p, q, h);
				b = hue2rgb(p, q, h - 1 / 3);
			}
			return {
				r: r * 255,
				g: g * 255,
				b: b * 255
			};
		},
		//#Class Method: colorTemptoRGB
		//
		//Converts colour temperatures to RGB colours
		//
		//##Options
		//  - `temp` : The colour temperature
		colorTempToRGB: function(temp) {
			temp /= 100;
			var r, g, b;

			if (temp <= 66) {
				r = 255;
				g = m.min(m.max(99.4708025861 * m.log(temp) - 161.1195681661, 0), 255);
			} else {
				r = m.min(m.max(329.698727446 * m.pow(temp - 60, -0.1332047592), 0), 255);
				g = m.min(m.max(288.1221695283 * m.pow(temp - 60, -0.0755148492), 0), 255);
			}

			if (temp >= 66) {
				b = 255;
			} else if (temp <= 19) {
				b = 0;
			} else {
				b = temp - 10;
				b = m.min(m.max(138.5177312231 * m.log(b) - 305.0447927307, 0), 255);
			}

			return {
				r: r,
				g: g,
				b: b
			}
		},
		//#Class Method: equalizeHistogram
		//
		//Do equalizations on a set of data
		//
		//##Options
		//  - `src` : The source data
		//  - `dst` _Optional_ : The destination where the result will be written. If omitted, the source will be overwritten.
		equalizeHistogram: function(src, dst) {
			var sLen = src.length;
			if (!dst) dst = src;
			var hist = new Float32Array(256),
				sum = 0;
			for (var i = 0; i < sLen; ++i) {
				++hist[~~src[i]];
				++sum;
			}
			// Compute integral histogram:
			var prev = hist[0];
			for (var i = 1; i < 256; ++i) {
				prev = hist[i] += prev;
			}
			// Equalize image:
			var norm = 255 / sum;
			for (var i = 0; i < sLen; ++i) {
				dst[i] = hist[~~src[i]] * norm;
			}
			return dst;
		},
		//#Class Method: smoothStep
		//
		//Implements cubic Hermite interpolation after doing a clamp.
		//
		//##Options
		// - `x` : the value to smooth, must be between `min` and `max`
		// - `min` : the minimum value
		// - `max` : the maximum value
		smoothStep: function(x, min, max) {
			var t = m.min(1, m.max((x - min) / (max - min), 0));
			return 3 * t * t - 2 * t * t * t;
		},
		//#Class Method: toWorker
		//
		//Sends graphics commands to Web Worker
		//* This is only for internal use only *
		//
		//##Options
		//  - `param` : The parameters to pass
		_toWorker: function(params) {
			if (this.worker) {
				extend(params, {
					data: this.ctx.getImageData(0, 0, this.width, this.height).data
				});
				this.worker.postMessage(params);
				return this;
			} else {
				assert(false, 'No web worker support!');
			}
		},
		//#Class Method: queue
		//
		//Queue the next effect operation to be called
		//* This is only useful with effects handled with Web Workers, currently only convolution effects *
		//
		//##Options
		//  - `func` : The function to execute
		queue: function(func) {
			if (!this.worker) {
				var pix = this.ctx.getImageData(0, 0, this.width, this.height);
				pix.data = func(pix.data);
				this.ctx.putImageData(pix, 0, 0);
			} else this._queue.push(func);
			return this;
		}
	});

	//colour effects
	extend(fx.prototype, {
		//#Class Method: greyscale
		//
		//Makes the image Black & White
		//
		//##Options
		//  - `mix` : The blending ratio between the original image & the greyscaled image.
		//            1 is completely B/W & 0 is the original image
		greyscale: function(mix) {
			mix = mix === undefined ? 1 : m.min(m.max(mix, 0), 1);
			var self = this;
			return this.process(function(r, g, b, a) {
				var l = self.luminance(r, g, b);
				return [l * mix + r * (1 - mix), l * mix + g * (1 - mix), l * mix + b * (1 - mix), a];
			});
		},
		//#Class Method: greyscale
		//
		//Makes the image Black & White, only
		//
		//##Options
		//  - `threshold` : The threshold rate
		threshold: function(threshold) {
			threshold = threshold || 127;
			var self = this;
			return this.process(function(r, g, b, a) {
				var l = self.luminance(r, g, b) > threshold ? 255 : 0;
				return [l, l, l, a];
			});
		},
		//#Class Method: invert
		//
		//Makes the image has a X-Ray feel.
		//
		//##Options
		//  - `mix` : The blending ratio between the original image & the inverted image.
		invert: function(mix) {
			mix = mix === undefined ? 1 : m.min(m.max(mix, 0), 1);
			return this.process(function(r, g, b, a) {
				return [(255 - r) * mix + r * (1 - mix), (255 - g) * mix + g * (1 - mix), (255 - b) * mix + b * (1 - mix), a];
			});
		},
		//#Class Method: sepia
		//
		//Gives the image an old yellowish look
		//
		//##Options
		//  - `mix` : The blending ratio between the original image & the sepia'ed image.
		sepia: function(mix) {
			mix = mix === undefined ? 1 : m.min(m.max(mix, 0), 1);
			return this.process(function(r, g, b, a) {
				var nr = (0.393 * r + 0.769 * g + 0.189 * b) * mix + r * (1 - mix);
				var ng = (0.349 * r + 0.686 * g + 0.168 * b) * mix + g * (1 - mix);
				var nb = (0.272 * r + 0.534 * g + 0.131 * b) * mix + b * (1 - mix);
				return [nr, ng, nb, a];
			});
		},
		//#Class Method: hdr
		//
		//Simulates High Dynamic Range (HDR) by changing contrast sinsounaously.
		//
		//##Options
		//  - No Options
		hdr: function() {
			var changeContrast = function(v) {
				if (v > 0 && v <= 127) {
					v = m.sin(m.PI * (90 - v / 4) / 180) * v;
				} else if (v > 127) {
					v = m.sin(m.PI * (90 - (255 - v) / 4) / 180) * v;
				}
				return v;
			};

			return this.process(function(r, g, b, a) {
				return [
					changeContrast(r),
					changeContrast(g),
					changeContrast(b),
					a
				];
			});
		}
	});

	//Special effects
	extend(fx.prototype, {
		//#Class Method: noise
		//
		//Generating noise by changing the brightness randomly.
		//
		//##Options
		//  - `amt` : The amount of noisiness
		//  - `alphanoise` : Also generate noise on alpha channels.
		noise: function(amt, alphanoise) {
			assert(amt >= 0, "Noise amount must be a positive number.");
			alphanoise = alphanoise || false;
			return this.process(function(r, g, b, a) {
				var noise = -amt / 2 + m.random() * amt * 2;
				return [r + noise, g + noise, b + noise, alphanoise ? a + noise : a];
			});
		},
		//#Class Method: glow
		//
		//Make the image glows.
		//
		//##Options
		//  - `radius` : The amount of glow
		glow: function(radius) {
			var self = this;

			//Blur it first
			this.blur(radius);

			//Apply a screen filter with the original image to make the glowing feel
			return this.queue(function(data) {
				var orig = self.ctx.getImageData(0, 0, self.width, self.height);
				for (var i = 0; i < data.length; i += 4) {
					data[i] = 255 - (((255 - data[i]) * (255 - orig.data[i])) / 255);
					data[i + 1] = 255 - (((255 - data[i + 1]) * (255 - orig.data[i + 1])) / 255);
					data[i + 2] = 255 - (((255 - data[i + 2]) * (255 - orig.data[i + 2])) / 255);
					data[i + 3] = 255 - (((255 - data[i + 3]) * (255 - orig.data[i + 3])) / 255);
				}
				return data;
			});
		},
		//#Class Method: colorMatrix
		//
		//Apply a 5x5 colour matrix to the image
		//
		//##Options
		//  - `matrix` : The colour matrix
		colorMatrix: function(matrix) {
			return this.process(function(r, g, b, a) {
				var nr = r * matrix[0] + g * matrix[1] + b * matrix[2] + a * matrix[3] + 255 * matrix[20];
				var ng = r * matrix[5] + g * matrix[6] + b * matrix[7] + a * matrix[8] + 255 * matrix[21];
				var nb = r * matrix[10] + g * matrix[11] + b * matrix[12] + a * matrix[13] + 255 * matrix[22];
				var na = r * matrix[15] + g * matrix[16] + b * matrix[17] + a * matrix[18] + 255 * matrix[23];
				return [nr, ng, nb, na];
			});
		},
		//#Class Method: equalize
		//
		//Equalize the image.
		//
		//##Options
		//  - No options
		equalize: function() {
			//Calculate the brightness first
			var self = this,
				table = new Uint8ClampedArray(this.width * this.height),
				i = 0;
			this.process(function(r, g, b, a) {
				table[i] = self.luminance(r, g, b);
				i++;
				return [r, g, b, a];
			});

			//Then equalize the data
			this.equalizeHistogram(table);
			i = 0;

			//Finally, change the brightness of every pixel
			return this.process(function(r, g, b, a) {
				var hsl = self.toHSL(r, g, b);
				hsl.l = table[i] / 255;
				i++;
				var rgb = self.toRGB(hsl.h, hsl.s, hsl.l);
				return [rgb.r, rgb.g, rgb.b, a];
			});
		},
		//#Class Method: TV
		//
		//Adds old TV feel to the image.
		//
		//##Options
		//  - No options
		tv: function(nScanLines, fScanLineInt) {
			// Add same scanlines to the image
			var self = this;

			nScanLines = m.max(m.min(nScanLines, 4096), 0);

			this.process(function(r, g, b, a, x, y) {
				var s = m.sin(y / self.width * nScanLines);
				var c = m.cos(y / self.width * nScanLines);

				var cr = (r / 255) * s * fScanLineInt * 255;
				var cg = (g / 255) * c * fScanLineInt * 255;
				var cb = (b / 255) * s * fScanLineInt * 255;

				return [cr, cg, cb, a];
			});

			// Generate some noise on the image
			// TODO: Improve the noise generation algorithm
			return this.noise(50);
		},

	});

	// Here are the adjustments
	//
	extend(fx.prototype, {
		//#Class Method: hue
		//
		//Adjust the hue or change the hue of an image.
		//
		//##Options
		//  - `hue` : The hue adjustment
		//  - `colorize` : Whether to chang the hue or to adjust the hue
		hue: function(hue, colorize) {
			assert(hue !== undefined, "Hue must be specified.")
			var self = this;
			colorize = colorize || false;
			return this.process(function(r, g, b, a) {
				var hsl = self.toHSL(r, g, b);
				if (colorize) {
					hsl.h = hue / 360;
				} else {
					hsl.h = hsl.h + hue / 360;
				}
				var rgb = self.toRGB(hsl.h, hsl.s, hsl.l);
				return [rgb.r, rgb.g, rgb.b, a];
			});
		},
		//#Class Method: saturation
		//
		//Adjust the saturation or change the saturation of an image.
		//
		//##Options
		//  - `sat` : The saturation adjustment 
		//  - `colorize` : Whether to chang the saturation or to adjust the saturation
		saturation: function(sat, colorize) {
			assert(sat !== undefined, "Saturation must be specified.")
			var self = this;
			colorize = colorize || false;
			return this.process(function(r, g, b, a) {
				var hsl = self.toHSL(r, g, b);
				if (colorize) {
					hsl.s = m.min(m.max(sat, 0), 1);
				} else {
					hsl.s = m.min(m.max(hsl.s * sat, 0), 1);
				}
				var rgb = self.toRGB(hsl.h, hsl.s, hsl.l);
				return [rgb.r, rgb.g, rgb.b, a];
			});
		},
		//#Class Method: brightness
		//
		//Adjust the brightness of an image.
		//
		//##Options
		//  - `brightness` : The brightness adjustment
		brightness: function(brightness) {
			assert(brightness !== undefined, "Brightness must be set");
			return this.process(function(r, g, b, a) {
				return [r * brightness, g * brightness, b * brightness, a];
			});
		},
		//#Class Method: contrast
		//
		//Adjust the contrast of an image.
		//
		//##Options
		//  - `level` : The contrast adjustment
		contrast: function(level) {
			assert(level !== undefined, "Contrast level must be set.");
			var self = this;
			level = m.pow((level + 100) / 100, 2);
			return this.process(function(r, g, b, a) {
				return [((r / 255 - 0.5) * level + 0.5) * 255, ((g / 255 - 0.5) * level + 0.5) * 255, ((b / 255 - 0.5) * level + 0.5) * 255, a];
			});
		},
		//#Class Method: gamma
		//
		//Adjust the gamma of an image.
		//
		//##Options
		//  - `gamma` : The gamma adjustment
		gamma: function(gamma) {
			assert(gamma !== undefined, "Gamma level must be set.");
			return this.process(function(r, g, b, a) {
				return [r * gamma * gamma, g * gamma * gamma, b * gamma * gamma, a];
			});
		},
		//#Class Method: gammaRGB
		//
		//Adjust the gamma of an image on different RGB channels.
		//
		//##Options
		//  - `lr` : The red gamma adjustment
		//  - `lg` : The green gamma adjustment
		//  - `lb` : The blue gamma adjustment
		gammaRGB: function(lr, lg, lb) {
			assert(lr !== undefined && lg !== undefined && lb !== undefined, "Gamma level must be set.");
			return this.process(function(r, g, b, a) {
				return [r * lr, g * lg, b * lb, a];
			});
		},
		//#Class Method: vibrance
		//
		//Adjust the vibrance of an image.
		//
		//##Options
		//  - `level` : The vibrance adjustment
		vibrance: function(level) {
			assert(level !== undefined, "Vibrance level must be set.");
			level *= -1;
			return this.process(function(r, g, b, a) {
				var max = m.max(r, g, b),
					avg = (r + g + b) / 3,
					amt = ((m.abs(max - avg) * 2 / 255) * level) / 100;
				if (r !== max) {
					r += (max - r) * amt;
				}
				if (g !== max) {
					g += (max - g) * amt;
				}
				if (b !== max) {
					b += (max - b) * amt;
				}
				return [r, g, b, a];
			});
		},
		//#Class Method: whiteBalance
		//
		//Adjust the white balance of an image.
		//
		//##Options
		//  - `level` : The colour temperature
		whiteBalance: function(temp) {
			var color = this.colorTempToRGB(temp);
			return this.process(function(r, g, b, a) {
				var nr = r * (255 / color.r);
				var ng = g * (255 / color.g);
				var nb = b * (255 / color.b);
				return [nr, ng, nb, a];
			});
		}
	});

	//Convolution effects
	extend(fx.prototype, {
		//#Class Method: convolute
		//
		//Apply a convolution matrix of any size to the image
		//
		//##Options
		//  - `weights` : The convolution matrix. It must be a _square_ matrix.
		//  - `offset` : The offset of the convoluted result
		//  - `opaque` : Whether not to handle the alpha component and make the image non-transparent.
		convolute: function(weights, offset, opaque) {
			assert(weights !== undefined, "Convolution matrix must be set.");
			assert(offset !== undefined, "Offset must be set.");
			opaque = opaque || true;

			if (this.worker) {
				this._toWorker({
					type: 'convolute',
					matrix: weights,
					offset: offset,
					opaque: opaque
				});
			} else {
				var pixels = this.ctx.getImageData(0, 0, this.width, this.height);
				var side = m.round(m.sqrt(weights.length));
				var halfSide = m.floor(side / 2);
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
				for (var y = 0; y < h; y++) {
					for (var x = 0; x < w; x++) {
						var sy = y;
						var sx = x;
						var dstOff = (y * w + x) * 4;
						//calculate the weighed sum of the source image pixels that
						//fall under the convolution matrix
						var r = 0,
							g = 0,
							b = 0,
							a = 0;
						for (var cy = 0; cy < side; cy++) {
							for (var cx = 0; cx < side; cx++) {
								var scy = sy + cy - halfSide;
								var scx = sx + cx - halfSide;
								if (scy >= 0 && scy < sh && scx >= 0 && scx < sw) {
									var srcOff = (scy * sw + scx) * 4;
									var wt = weights[cy * side + cx];
									r += src[srcOff] * wt;
									g += src[srcOff + 1] * wt;
									b += src[srcOff + 2] * wt;
									a += src[srcOff + 3] * wt;
								}
							}
						}
						dst[dstOff] = offset + r;
						dst[dstOff + 1] = offset + g;
						dst[dstOff + 2] = offset + b;
						dst[dstOff + 3] = a + alphaFac * (255 - a);
					}
				}
				this.ctx.clearRect(0, 0, this.width, this.height);
				this.ctx.putImageData(output, 0, 0);
			}
			return this;
		},
		//#Class Method: blur
		//
		//Apply box blur to the image.
		//
		//##Options
		//  - `level` : The blur radius
		blur: function(level) {
			assert(level !== undefined, "Blur radius must be set.");
			var len = level * level;
			var val = 1 / len;
			var matrix = [];
			if (len < 4) {
				//if the length of the matrix is less than 4,
				//it means that the blur radius is less than 2. There's no need to blur.
				return this;
			}
			//Fill up our convolution matrix with values
			while (len--) {
				matrix.push(val);
			}
			return this.convolute(matrix, 0, false);
		},
		//#Class Method: sharpen
		//
		//Sharpen the image
		//
		//##Options
		//  - _No options_
		sharpen: function() {
			return this.convolute([0, -1, 0, -1, 5, -1, 0, -1, 0], 0, false);
		},
		//#Class Method: emboss
		//
		//Emboss the image
		//
		//##Options
		//  - _No options_
		emboss: function() {
			return this.convolute([2, 0, 0, 0, -1, 0, 0, 0, -1], 127, false);
		},
		//#Class Method: findEdges
		//
		//Highlight the edges using a sobel filter.
		//
		//##Options
		//  - _No options_
		findEdges: function() {
			return this.convolute([-1, 0, 1, -2, 0, 2, -1, 0, 1], 0, false);
		}
	});

	window['CanvasEffects'] = fx;
})(window);