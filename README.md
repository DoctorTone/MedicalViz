# MedicalViz
Volume rendering of medial images

This app visualises multiple MRI scans of the human brain.
The images are formed into an nrrd model (essentailly all the images are loaded in one dataset).
Once this model is loaded we effectively have a three-dimensional texture.

The rendering uses the proxy geometry method (asoppsed to other methods such as ray casting) whereby we create slices into the geomerty that we can then render the relevant image onto. This allows us to control the level of detail in the model as we can define the number of slices that are contained within it, more slices leads to a more detailed view of the structure.

We can also alter the transparency of each slice and therefore show internal structures that would normally be difficult to visualise.

The application offers many ways in which to interact with the data such as rendering a solid version of the model, or slicing through the model along each of the axes.

All the controls are self explanatory and allow the patient data to be analysed in detail. You can also highlight and visualise a specific portion of the model by placing a box around the relevant structure and visualising this data in isolation.
