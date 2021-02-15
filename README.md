# MedicalViz
Volume rendering of medial images

This app visualises multiple MRI scans of the human brain.
The images are formed into an nrrd model (essentailly all the images are loaded in one dataset).
Once this model is loded we effectively have a three-dimensional texture.

The rendering uses the proxy geometry method (asoppsed to other methods such as ray casting) whereby we create slices into the geomerty that we can then render the relevant image onto.
