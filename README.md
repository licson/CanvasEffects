CanvasEffects
=============
It is a little javascript library for you to add some effects on photos using HTML5 canvas

Features
=============
 - Simple photo effects
   1. Greyscale
   2. Threshold [(example)](http://licson0729.github.com/CanvasEffects/examples/threshold.html)
   3. Sepia [(example)](http://licson0729.github.com/CanvasEffects/examples/sepia.html)
 - Adjustments [(example)](http://licson0729.github.com/CanvasEffects/examples/adjustments.html)
   1. Brightness
   2. Contrast
   3. Gamma
   4. Hue
   5. Saturation
 - Convolution effects
   1. Custom _n*n_ convolution matrix
   2. Box Blur [(example)](http://licson0729.github.com/CanvasEffects/examples/blur.html)
   3. Emboss
   4. Sharpen
   5. Find Edges

What's new
==============

1. Add new effects (Gamma,contrast).
2. Improve the blur algorithm to support variable blur radius.
3. Use web worker to do the image processing if supported.
4. Rewrite CanvasEffects to make it more easy to manage.

How to use
==============

	var canvas = document.getElementById('fx'); //the canvas object
	var fx = new CanvasEffects(canvas,opts); //Initlize the CanvasEffect instance
	
	//load the image
	fx.load('pict.jpg');
	
	//call the effect methods
	//for example,
	fx.greyscale();
	fx.blur(10);
	fx.sepia();
	
	//effect methods can be chained
	fx.sepia().gamma(1.1).blur(30);

Development
===============

This is an active project. If you have any suggestions or having bugs please make it as an issue.
