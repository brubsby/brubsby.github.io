import { ObjectSampler } from './utils.js';

// New animations are registered here and only here, and animations.html looks here to find them.

export const animations_data = [
    { file: "null.js", weight: 0, description: "the blank canvas" },
    { file: "sfc.js", weight: 2, description: "space filling curves" },
    { file: "saw.js", weight: 2, description: "self-avoiding walk" },
    { file: "rndfill.js", weight: 1, description: "random fill" },
    { file: "eratosthenes.js", weight: 2, description: "sieve of eratosthenes" },
    { file: "knightstour.js", weight: 2, description: "knight's tour algorithm" },
    { file: "textgen.js", weight: 3, description: "text being written" },
    { file: "tenprint.js", weight: 3, description: "10 PRINT CHR$(205.5+RND(1)); : GOTO 10" },
    { file: "circ.js", weight: 1, description: "a simple circle" },
    { file: "tris.js", weight: 1, description: "two simple triangles" },
    { file: "heart.js", weight: 0.1, description: "<3 (for my wife)" },
    { file: "simplex_growth.js", weight: 1.25, description: "simplex noise" },
    { file: "mapgen.js", weight: 2, description: "ascii map generation" },
    { file: "dvdball.js", weight: 1, description: "dvd logo type beat" },
    { file: "dog.js", weight: 0.75, description: "my dog :)" },
    { file: "bresenham_bounce.js", weight: 1.5, description: "bresenham lines bouncing around" },
    { file: "flow_fields.js", weight: 3, description: "particles in simplex flow fields" },
    { file: "clock.js", weight: 1, description: "functional ascii clock" },
    { file: "sand.js", weight: 4, description: "falling sand" },
    { file: "fractal.js", weight: 4, description: "ascii based escape time fractal rendering engine" }, // includes mandelbrot, julia, and many more 
    { file: "1d_automata.js", weight: 2, description: "elementary cellular automata" },
    { file: "2d_automata.js", weight: 6, description: "practically every isotropic cellular automata" },
    { file: "langtons_ant.js", weight: 3, description: "langton's ant" },
    { file: "cyclic_ca.js", weight: 1, description: "cyclic cellular automata" },
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
    { file: "percolation.js", weight: 2, description: "fluid seeping through a porous random grid" },
    { file: "adhesion.js", weight: 3, description: "differential adhesion cell sorting" }
];

export const animations = new ObjectSampler();
for (let i = 0; i < animations_data.length; i++) {
    animations.put(animations_data[i].file, animations_data[i].weight);
}


/* here's some more ideas I'll probably get around to:
	* pathfinding algorithms (a*, etc.)
	* lattice boltzman method
	* moire patterns
	* n-body gravity visualization
	* double pendulum
	* add turmites to langton
	* add more ants to langton
	* abelian sand pile (figure out how to do perfect rectangular grids)
	* lots of strange attractors (with lissajous style animation)
	* phyllotaxis
	* waveform collapse
	* biham–middleton–levine traffic model
	* metaballs
	* marching squares
	* ising model
	* add a database of game of life patterns to spawn in with
	* wilmot's warehouse simulation
	* maze generation (wilson's algorithm)
	* water ripples
	* auto playing tetris
	* verlet integration (cloth/rope)
	* wa-tor world (might be a subset of cyclic automata?)
	* galton board
	* spinning donut
	* more triangle based meshes for raster.js
	* chladni plates
	* ant colony
	* toothpick sequence
	* plasma effect
	* better mapgen
	* better simplex 
	* forest fire model
	* brian's brain (can probably add to 2d_automata)
	* inverted pendulum
	* fourier epicycles
	* maurer rose
	* rain simulation
	* tunnel effect
	* nagel-schreckenberg traffic
	* xylem
	* hyphae
	* coupled map lattice
	* turing machine / busy beaver
	* sundial
	* schelling's model of segregation
	* differential line growth
	* lennard-jones molecular dynamics
	* ulam-warburton automaton
	* spirograph
	* belousov-zhabotinsky (bz) reaction
	* rotozoom
	* inverse kinematics
	* stigmergic termites
	* eden growth model (lichen/tumor growth)
	* run and tumble chemotaxis
	* sir/seir epidemic model
	* cellular potts model
	* kuramoto model (fireflies)
	* lenia (continuous life)
	* daisyworld
	* canopy shyness
*/

/* things that seem like I'd want to do them but I don't (maybe I just need to make them more interesting somehow):
	* barnsley fern
	* henon map
	* dragon curve
	* poisson disk sampling
	* wireworld
	* schotter homage
	* starfield
	* sorting algorithm
	* ulam's spiral
	* tessaract
	* markov chain
	* lindenmayer systems
	* soft body tetris
	* matrix rain
	* quine relay
	* defragmenter
	* poincare disk
	* chaos game
	* traveling salesman problem
	* penrose tiling
	* voronoi stipling
*/
