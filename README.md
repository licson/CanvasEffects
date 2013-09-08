CanvasEffects
=============
It is a little javascript library for you to add some effects on photos using HTML5 canvas

Features
=============
 - Simple photo effects [(example)](http://licson0729.github.com/CanvasEffects/examples/effects.html)
   1. Greyscale
   2. Threshold [(example)](http://licson0729.github.com/CanvasEffects/examples/threshold.html)
   3. Sepia
   4. Invert
 - Adjustments [(example)](http://licson0729.github.com/CanvasEffects/examples/adjustments.html)
   1. Brightness
   2. Contrast
   3. Gamma
   4. Hue
   5. Saturation
   6. Vibrance
   7. White Balance adjust [(It can also generate a colour temp. chart)](http://licson0729.github.com/CanvasEffects/examples/colorTempChart.html)
   8. Equalization
 - Special effects
   1. Glow [(example)](http://licson0729.github.com/CanvasEffects/examples/effects.html)
   2. Noise [(example)](http://licson0729.github.com/CanvasEffects/examples/effects.html)
   3. Color matrix ([See here for details](http://msdn.microsoft.com/en-us/library/system.drawing.imaging.colormatrix.aspx))
   4. HDR
   5. Old TV
 - Convolution effects
   1. Custom _n*n_ convolution matrix
   2. Box Blur [(example)](http://licson0729.github.com/CanvasEffects/examples/blur.html)
   3. Emboss
   4. Sharpen
   5. Find Edges

What's new
==============

1. Add new effects (White Balance adjust).
2. Add new examples: [A colour chart](http://licson0729.github.com/CanvasEffects/examples/colorTempChart.html) and [(3x3 custom convolution matrix)](http://licson0729.github.com/CanvasEffects/examples/matrix.html).
3. Added `fx.colorTempToRGB(temp)` to convert colour temperstures to RGB values.

How to use
==============

	var canvas = document.getElementById('fx'); //the canvas object
	var opts = {
		useWorker:true, //Whether to use Web Worker to do the processing or not
		workerPath:'./CanvasEffects.worker.min.js', //The path to the worker
		width: 100, //Override the width of the original canvas
		height: 100 //Override the height of the original canvas
	}
	var fx = new CanvasEffects(canvas,opts); //Initlize the CanvasEffect instance
	
	//load the image
	fx.load('pict.jpg', function(){
		//call the effect methods
		//for example,
		this.greyscale();
		this.blur(10);
		this.sepia();
		this.glow(5);
	});
	
	//effect methods can be chained
	fx.sepia().gamma(1.1).blur(30).glow(5);

Development
===============

This is an active project. If you have any suggestions or having bugs please make it as an issue.
