CanvasEffects
=============
It is a little javascript library for you to add some effects on photos using HTML5 canvas

Features
=============
 Simple photo effects
  Greyscale
  Threshold
  Sepia
 Adjustments
  Brightness
  Contrast
  Gamma
  Hue
  Saturation
 Convolution effects
  Custom _n*n_ convolution matrix
  Box Blur
  Emboss
  Sharpen
  Find Edges

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
