import { ObjectSampler } from './utils.js';

// New animations are registered here and only here, and animations.html looks here to find them.

export const animations_data = [
    { file: "null.js", weight: 0, description: "the blank canvas" },
    { file: "sfc.js", weight: 2, description: "space filling curves" },
    { file: "saw.js", weight: 2, description: "self-avoiding walk" },
    { file: "rndfill.js", weight: 1, description: "random fill" },
    { file: "eratosthenes.js", weight: 2, description: "sieve of eratosthenes" },
    { file: "knight.js", weight: 2, description: "knight's tour algorithm" },
    { file: "textgen.js", weight: 3, description: "text being written" },
    { file: "tenprint.js", weight: 3, description: "10 PRINT CHR$(205.5+RND(1)); : GOTO 10" },
    { file: "circ.js", weight: 1, description: "a simple circle" },
    { file: "tris.js", weight: 1, description: "two simple triangles" },
    { file: "heart.js", weight: 0.1, description: "<3 (for my wife)" },
    { file: "simplex.js", weight: 1.25, description: "simplex noise" },
    { file: "mapgen.js", weight: 2, description: "ascii map generation" },
    { file: "dvdball.js", weight: 1, description: "dvd logo type beat" },
    { file: "dog.js", weight: 0.75, description: "my dog :)" },
    { file: "bresenham.js", weight: 1.5, description: "bresenham lines bouncing around" },
    { file: "flow.js", weight: 3, description: "particles in simplex flow fields" },
    { file: "clock.js", weight: 1, description: "functional ascii clock" },
    { file: "sand.js", weight: 4, description: "falling sand" },
    { file: "fractal.js", weight: 4, description: "ascii based escape time fractal rendering engine" }, // includes mandelbrot, julia, and many more 
    { file: "eca.js", weight: 2, description: "elementary cellular automata" },
    { file: "automata.js", weight: 6, description: "practically every isotropic cellular automata" }, // includes many named variants, e.g. brian's brain, ulam warburton
    { file: "langton.js", weight: 3, description: "langton's ant" },
    { file: "boids.js", weight: 3, description: "my boids" },
    { file: "gas.js", weight: 3, description: "ideal gas simulation" },
    { file: "voronoi.js", weight: 3, description: "voronoi diagrams" },
    { file: "worley.js", weight: 3, description: "worley noise" },
    { file: "lissajous.js", weight: 3, description: "lissajous curves" },
    { file: "fluid.js", weight: 3, description: "most complex ascii fluid" },
    { file: "bytebeat.js", weight: 3, description: "bytebeat screensaver from o_c" },
    { file: "dla.js", weight: 2, description: "diffusion-limited aggregation" },
    { file: "physarum.js", weight: 3, description: "slime mold simulation" },
    { file: "raster.js", weight: 3, description: "ascii rasterized uniform polyhedra via wythoff construction" },
    { file: "reacdiff.js", weight: 3, description: "grey-scott reaction-diffusion" },
    { file: "fire.js", weight: 3, description: "doom-style fire" },
    { file: "plasma.js", weight: 3, description: "classic plasma effect" },
    { file: "percolation.js", weight: 2, description: "fluid seeping through a porous random grid" },
    { file: "adhesion.js", weight: 3, description: "differential adhesion cell sorting" },
    { file: "moire.js", weight: 2, description: "ascii moire patterns" },
    { file: "rain.js", weight: 2, description: "rain" },
    { file: "snow.js", weight: 2, description: "snow" },
    { file: "phyllotaxis.js", weight: 2, description: "vogel's model of phyllotaxis" },
    { file: "spirograph.js", weight: 2, description: "hypotrochoids and epitrochoids" },
    { file: "maurer.js", weight: 2, description: "maurer roses" },
    { file: "sandpile.js", weight: 3, description: "abelian sand pile" },
    { file: "metaballs.js", weight: 3, description: "metaballs" },
    { file: "toothpick.js", weight: 2, description: "toothpick sequence" },
    { file: "ising.js", weight: 3, description: "ising model of ferromagnetism in statistical mechanics" },
    { file: "stars.js", weight: 2, description: "accurate night sky" },
    { file: "rotozoom.js", weight: 2, description: "classic rotozoom effect" }
];

export const animations = new ObjectSampler();
for (let i = 0; i < animations_data.length; i++) {
    animations.put(animations_data[i].file, animations_data[i].weight);
}


/* here's some more ideas I'll probably get around to:
	* xylem
	* hyphae
	* sundial
	* ant colony
	* daisyworld
	* galton board
	* tunnel effect
	* water ripples
	* canopy shyness
	* chladni plates
	* hopf fibration
	* spinning donut
	* double pendulum
	* marching squares
	* fourier epicycles
	* inverted pendulum
	* waveform collapse
	* inverse kinematics
	* auto playing tetris
	* coupled map lattice
	* stigmergic termites
	* cellular potts model
	* add turmites to langton
	* lattice boltzman method
	* lenia (continuous life)
	* sir/seir epidemic model
	* differential line growth
	* run and tumble chemotaxis
	* kuramoto model (fireflies)
	* nagel-schreckenberg traffic
	* n-body gravity visualization
	* turing machine / busy beaver
	* wilmot's warehouse simulation
	* verlet integration (cloth/rope)
	* lennard-jones molecular dynamics
	* schelling's model of segregation
	* pathfinding algorithms (a*, etc.)
	* belousov-zhabotinsky (bz) reaction
	* biham–middleton–levine traffic model
	* maze generation (wilson's algorithm)
	* eden growth model (lichen/tumor growth)
	* more triangle based meshes for raster.js
	* wa-tor world (might be a subset of cyclic automata?)
	* add a database of game of life patterns to spawn in with
	* lots of strange attractors (with lissajous style animation)
*/

/* things that seem like I'd want to do them but I don't (maybe I just need to make them more interesting somehow):
	* henon map
	* starfield
	* tessaract
	* wireworld
	* chaos game
	* matrix rain
	* quine relay
	* defragmenter
	* dragon curve
	* markov chain
	* barnsley fern
	* poincare disk
	* ulam's spiral
	* penrose tiling
	* schotter homage
	* soft body tetris
	* voronoi stipling
	* sorting algorithm
	* forest fire model
	* lindenmayer systems
	* poisson disk sampling
	* traveling salesman problem
*/
