CanvasEffects
=============

It is a little javascript library for you to add some effects on photos using HTML5 canvas

Usage:

1. Create a canvas element for your image first
2. Initialize a new CanvasEffect context and pass the canvas element to the constructer
3. Draw something on the canvas
4. Run the effects provided by CanvasEffects

Effects provided:
> -greyscale
> -sepia
> -adjust hue, saturation and lightness
> -custom convolution effect
> -blur
> -sharpen
> -find edges
> -highlight edges
> -emboss

You can find more details in the code.

How to use
=============

    var fx = new CanvasEffects(canvas); // canvas is the canvas DOM object
	fx.greyscale(); // call effects on it
	[...]

Also, the library is extendable. You can add more effects by yourself.