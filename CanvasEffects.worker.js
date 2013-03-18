//Hack for IE10
//they don't have support for Uint8ClampedArray
if(typeof Uint8ClampedArray === "undefined") Uint8ClampedArray = Uint8Array;

var w, h;

var fx = {
	convolute:function(data,weights,offset,opaque){
		opaque = opaque || true;
		var side = Math.round(Math.sqrt(weights.length));
		var halfSide = Math.floor(side/2);
		var src = data;
		var sw = w;
		var sh = h;
		var dst = new Uint8ClampedArray(data.length);
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
		return dst;
	},
	process:function(data,func){
		for(var i = 0; i < data.length; i+=4){
			var out = func(data[i],data[i+1],data[i+2],data[i+3]);
			data[i] = out[i];
			data[i+1] = out[i+1];
			data[i+2] = out[i+2];
			data[i+3] = out[i+3];
		}
		return data;
	}
};

this.onmessage = function(e){
	var data = e.data;
	switch(data.type){
		case 'init':
		w = data.w;
		h = data.h;
		break;
	
		case "convolute":
		this.postMessage(fx.convolute(data.data,data.matrix,data.offset,data.opaque));
		break;
		
		case 'process':
		this.postMessage(fx.process(data.data,data.func));
		break;
	}
};