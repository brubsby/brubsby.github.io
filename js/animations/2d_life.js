import {
  ObjectSampler,
  tooltip,
  get_canvas_index,
  setCharAtIndex,
  get_coords,
  get_bresenham_line_points,
  get_bresenham_circle_points,
  init_simplex_noise,
  get_simplex_noise_at,
} from "../utils.js";

function get_max_neighbors(r, t, include_center) {
  let result = 8;
  if ("+X".includes(t)) result = r * 4;
  else if ("*#".includes(t)) result = r * 8;
  else if ("BD".includes(t)) result = ((2 * r + 1) ** 2 - 1) / 2;
  else if (t === "M") result = (2 * r + 1) ** 2 - 1;
  else if (t === "N") result = 2 * r * (r + 1);
  else if ("C2".includes(t)) {
    let count = 0,
      r2 = t === "C" ? r * (r + 1) : r * r;
    for (let i = -r; i <= r; i++) {
      let w = 0;
      while ((w + 1) ** 2 + i * i <= r2) w++;
      count += 2 * w + 1;
    }
    result = count - 1;
  }
  return result + (include_center ? 1 : 0);
}

// Helper to generate neighbor offsets based on type and range
function get_neighbor_offsets(range, type, include_center) {
  let offsets = [];
  for (let dy = -range; dy <= range; dy++) {
    for (let dx = -range; dx <= range; dx++) {
      if (!include_center && dx === 0 && dy === 0) continue;

      let dist_sq = dx * dx + dy * dy;
      let dist_manhattan = Math.abs(dx) + Math.abs(dy);
      let dist_chebyshev = Math.max(Math.abs(dx), Math.abs(dy));

      let include = false;

      switch (type) {
        case "M": // Moore
          include = dist_chebyshev <= range;
          break;
        case "N": // Von Neumann
          include = dist_manhattan <= range;
          break;
        case "2": // Euclidean
          include = dist_sq <= range * range;
          break;
        case "C": // Circular (approx Euclidean r+0.5)
          include = dist_sq <= range * (range + 1);
          break;
        case "+": // Cross
          include = (dx === 0 || dy === 0) && dist_chebyshev <= range;
          break;
        case "X": // Saltire
          include = Math.abs(dx) === Math.abs(dy) && dist_chebyshev <= range;
          break;
        case "*": // Star (Cross + Saltire)
          include =
            (dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy)) &&
            dist_chebyshev <= range;
          break;
        case "B": // Checkerboard (Odd parity sum relative to center)
          include = dist_chebyshev <= range && (dx + dy) % 2 !== 0;
          break;
        case "D": // Aligned Checkerboard (Even parity sum relative to center)
          include = dist_chebyshev <= range && (dx + dy) % 2 === 0;
          break;
        case "#": // Hash (Hashtag shape)
          include =
            dist_chebyshev <= range &&
            (Math.abs(dx) === 1 || Math.abs(dy) === 1);
          break;
      }

      if (include) {
        offsets.push([dx, dy]);
      }
    }
  }
  return offsets;
}

// Helper to parse rule string
function parse_rule(rule_str) {
  rule_str = rule_str.toUpperCase().replace(/\s/g, "");
  let suffix = "";
  if (rule_str.includes(":")) {
    let parts = rule_str.split(":");
    rule_str = parts[0];
    suffix = parts[1];
  }

  let rule = {
    born: [],
    survive: [],
    range: 1,
    type: "M",
    states: 2,
    include_center: false,
    name: rule_str,
  };

  // Parse suffix if present
  if (suffix) {
    let topo_char = suffix.charAt(0);
    let dims = suffix
      .substring(1)
      .split(",")
      .map((x) => parseInt(x, 10));
    if (dims.length >= 2) {
      rule.width = dims[0];
      rule.height = dims[1];
      if (topo_char === "T") rule.topology = "toroidal";
      else if (topo_char === "P") rule.topology = "plane";
    }
  }

  // 1. Check for Kellie Evans' notation: 5 integers separated by commas
  // r,b_min,b_max,s_min,s_max
  if (/^\d+,\d+,\d+,\d+,\d+$/.test(rule_str)) {
    let parts = rule_str.split(",").map((x) => parseInt(x, 10));
    rule.range = parts[0];
    let b_min = parts[1],
      b_max = parts[2];
    let s_min = parts[3],
      s_max = parts[4];

    for (let i = b_min; i <= b_max; i++) rule.born.push(i);
    for (let i = s_min; i <= s_max; i++) rule.survive.push(i);

    rule.include_center = true; // Evans' implies totalistic (M1)
    rule.type = "M";
    rule.states = 2;
  }
  // 2. Check for LtL / HROT (Start with R)
  else if (rule_str.startsWith("R")) {
    let tokens = rule_str.split(",");
    let current_mode = null;
    let m_found = false;

    const parse_ranges = (val, target_array) => {
      // Handle single number, "min..max", or "min-max"
      // Note: "-" can be ambiguous if we had negative numbers, but here we don't.
      let range_sep = val.includes("..") ? ".." : "-";
      if (val.includes(range_sep)) {
        let r_parts = val.split(range_sep);
        let min = parseInt(r_parts[0], 10);
        let max = parseInt(r_parts[1], 10);
        for (let k = min; k <= max; k++) target_array.push(k);
      } else {
        let n = parseInt(val, 10);
        if (!isNaN(n)) target_array.push(n);
      }
    };

    for (let token of tokens) {
      let match = token.match(/^([RCMSBN])(.*)/);
      let val = token;

      if (match) {
        current_mode = match[1];
        val = match[2];
      }

      if (val === "" && match) continue; // Just a mode switch like "S" then next token "2"

      if (current_mode === "R") rule.range = parseInt(val, 10);
      else if (current_mode === "C") {
        rule.states = parseInt(val, 10);
        if (rule.states < 2) rule.states = 2;
      } else if (current_mode === "M") {
        rule.include_center = val === "1";
        m_found = true;
      } else if (current_mode === "N") {
        if (val === "H") rule.type = "#";
        else if (val === "S") rule.type = "*";
        else if (val === "P") rule.type = "+";
        else rule.type = val || "M"; // Default to M if just "N"
      } else if (current_mode === "S") parse_ranges(val, rule.survive);
      else if (current_mode === "B") parse_ranges(val, rule.born);
    }

    // HROT defaults to M0 if M not specified
    if (!m_found) rule.include_center = false;
  }
  // 3. Life-like (B.../S... or .../...)
  else {
    let parts = rule_str.split("/");
    let b_part = parts.find((p) => p.startsWith("B"));
    let s_part = parts.find((p) => p.startsWith("S"));

    if (b_part) {
      rule.born = b_part
        .substring(1)
        .split("")
        .map((d) => parseInt(d, 10));
    }
    if (s_part) {
      rule.survive = s_part
        .substring(1)
        .split("")
        .map((d) => parseInt(d, 10));
    }

    // Fallback for just numbers like "23/3" -> S23/B3 (Conway standard order often S/B in pure numbers)
    // But requested to be permissive. If strict B/S prefixes missing:
    if (!b_part && !s_part && parts.length === 2) {
      // Assume S/B (Survival / Birth) common in "23/3"
      rule.survive = parts[0].split("").map((d) => parseInt(d, 10));
      rule.born = parts[1].split("").map((d) => parseInt(d, 10));
    }
  }

  // Ensure sets and uniqueness
  rule.born = [...new Set(rule.born)].sort((a, b) => a - b);
  rule.survive = [...new Set(rule.survive)].sort((a, b) => a - b);
  rule.born_set = new Set(rule.born);
  rule.survive_set = new Set(rule.survive);

  return rule;
}

export default (this_animation) => {
  if (window.frame_count == 0) {
    window.is_toroidal = Math.random() < 0.75;

    // Helper to format ranges for name
    const format_ranges = (arr) => {
      if (!arr || arr.length === 0) return "";
      let sorted = [...new Set(arr)].sort((a, b) => a - b);
      let parts = [];
      let start = sorted[0];
      let prev = start;
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] !== prev + 1) {
          parts.push(start === prev ? `${start}` : `${start}-${prev}`);
          start = sorted[i];
        }
        prev = sorted[i];
      }
      parts.push(start === prev ? `${start}` : `${start}-${prev}`);
      return parts.join(",");
    };

    const named_rule = (str, name, description = "") => {
      let r = parse_rule(str);
      r.name = name;
      if (description) r.description = description;
      return r;
    };

    // Outer Totalistic Moore Rulesets
    var rulesets = new ObjectSampler()
      .put(
        named_rule(
          "B0123478/S01234678",
          "AntiLife",
          "The black/white reversal of Conway's Game of Life.",
        ),
        1,
      )
      .put(
        named_rule(
          "B0123478/S34678",
          "InverseLife",
          "A rule by Jason Rampe, showing similar oscillators and gliders to Conway's Game of Life. The black/white reversal of B3678/S23.",
        ),
        1,
      )
      .put(
        named_rule(
          "B014/S2",
          "Oils",
          "An exploding rule that forms many wickstrechers, along with other patterns such as a c/16 diagonal spaceship.",
        ),
        1,
      )
      .put(named_rule("B017/S01", "B017/S01"), 1)
      .put(
        named_rule(
          "B026/S1",
          "B026/S1",
          "Simulates range-2 wolfram rule 2166637080",
        ),
        1,
      )
      .put(
        named_rule(
          "B1/S012345678",
          "H-trees",
          "An exploding rule where H-shaped branches grow from pattern borders.",
        ),
        1,
      )
      .put(
        named_rule(
          "B1/S014567",
          "Fuzz",
          "An exploding rule in which solid patterns appear.",
        ),
        1,
      )
      .put(
        named_rule(
          "B1/S1",
          "Gnarl",
          "A simple exploding rule by Kellie Evans that forms complex patterns from even a single live cell.",
        ),
        1,
      )
      .put(
        named_rule(
          "B1/S134567",
          "Snakeskin",
          "A rule in which patterns explode and form snake-like patterns.",
        ),
        1,
      )
      .put(
        named_rule(
          "B12678/S15678",
          "Solid islands grow amongst static",
          "A rule in which patterns grow exponentially and form solid patterns inside static-like patterns.",
        ),
        1,
      )
      .put(
        named_rule(
          "B1357/S1357",
          "Replicator",
          "A rule in which every pattern is a replicator.",
        ),
        1,
      )
      .put(
        named_rule(
          "B1357/S02468",
          "Fredkin",
          'A rule in which, like Replicator, every pattern is a replicator. Also known as "Replicator 2".',
        ),
        1,
      )
      .put(
        named_rule(
          "B1358/S0247",
          "Feux",
          "An explosive rule where patterns turn into replicators and flash in and out of existence.",
        ),
        1,
      )
      .put(
        named_rule(
          "B168/S236",
          "Forrest of Ls",
          "An explosive rule where the insides of patterns slowy stablize into still formations.",
        ),
        1,
      )
      .put(
        named_rule(
          "B2/S",
          "Seeds",
          "An exploding rule by Brian Silverman in which every cell dies in every generation. It has many simple orthogonal spaceships, though it is in general difficult to create patterns that don't explode.",
        ),
        2,
      )
      .put(
        named_rule(
          "B2/S0",
          "Live Free or Die",
          "An exploding rule in which only cells with no neighbors survive. It has many spaceships, puffers, and oscillators, some of infinitely extensible size and period.",
        ),
        1,
      )
      .put(
        named_rule(
          "B2/S13",
          "B2/S13",
          "An exploding rule, one of the few B2 life-like rules that has a replicator.",
        ),
        1,
      )
      .put(
        named_rule(
          "B2/S2345",
          "B2/S2345",
          "An exploding rule, with still lifes that may form indestructible barriers to growth, which can be used as casing for single-use wires, out of which logic gates can be constructed.",
        ),
        1,
      )
      .put(named_rule("B2/S23456", "B2/S23456", "Similar to B2/S234"), 1)
      .put(
        named_rule("B2/S2345678", "B2/S2345678", "Similar to B2/S2345"),
        1,
      )
      .put(
        named_rule(
          "B234/S",
          "Serviettes",
          'An exploding rule in which every cell dies in every generation (like Seeds). This rule is of interest because of the fabric-like beauty of the patterns that it produces. Also known as "Persian Rug".',
        ),
        2,
      )
      .put(
        named_rule(
          "B25/S4",
          "B25/S4",
          "An exploding rule, it has a one-dimensional asymmetric replicator.",
        ),
        1,
      )
      .put(
        named_rule(
          "B25678/S5678",
          "Iceballs",
          'Small masses of solid living cells flicker in and out of existence. Some reach a critical mass and begin to slowly grow. Also known as "Ice nine".',
        ),
        1,
      )
      .put(
        named_rule(
          "B3/S012345678",
          "Life without death",
          'An expanding rule that produces complex flakes, featuring dense wickstretchers named "ladders". Also known as "Flakes" or "Inkspot".',
        ),
        2,
      )
      .put(
        named_rule(
          "B3/S023",
          "DotLife",
          "An exploding rule closely related to Conway's Life. The B-heptomino is a common infinite growth pattern in this rule, though it can be stabilized into a spaceship.",
        ),
        3,
      )
      .put(
        named_rule(
          "B3/S0248",
          "Star Trek",
          "A rule with several spaceships of various speeds.",
        ),
        1,
      )
      .put(
        named_rule(
          "B3/S12",
          "Flock",
          "Patterns tend to quickly settle into dominoes, duoplets and period 2 oscillators. There is a common period 14 shuttle oscillator involving the pre-beehive.",
        ),
        1,
      )
      .put(
        named_rule(
          "B3/S1234",
          "Mazectric",
          'An expanding rule that crystalizes to form maze-like designs that tend to be straighter (ie. have longer "halls") than the standard maze rule.',
        ),
        2,
      )
      .put(
        named_rule(
          "B3/S12345",
          "Maze",
          "An expanding rule that crystalizes to form maze-like designs.",
        ),
        2,
      )
      .put(
        named_rule(
          "B3/S123678",
          "Magnezones",
          "An explosive rule that is liquid with four types of crystals appearing in the liquid.",
        ),
        1,
      )
      .put(named_rule("B3/S1237", "SnowLife"), 1)
      .put(
        named_rule(
          "B3/S124",
          "Corrosion of Conformity",
          "A rule similar to Mazectric but without S3. A slow burn from almost any starting pattern, resulting in a rusting away of the local continuum.",
        ),
        1,
      )
      .put(named_rule("B3/S128", "EightFlock"), 1)
      .put(named_rule("B3/S13", "LowLife"), 1)
      .put(
        named_rule(
          "B3/S2",
          "B3/S2",
          "This rule has 6 small still lifes, the tub, the hive, the aircraft carrier, the loaf, the mango, and the pond. However, there are no still lifes with more than 8 and less than 20 cells.[citation needed] There are also a few common oscillators, including the blinker and the toad, and lots of rare ones.",
        ),
        1,
      )
      .put(
        named_rule(
          "B3/S23",
          "Conway's Life",
          "A chaotic rule that is by far the most well-known and well-studied. It exhibits highly complex behavior.",
        ),
        100,
      )
      .put(named_rule("B3/S2378", "B3/S2378"), 1)
      .put(
        named_rule("B3/S238", "EightLife", 'Also known as "Pulsar Life".'),
        2,
      )
      .put(
        named_rule(
          "B3/S245678",
          "Shoots and Roots",
          "Shoots are slow growing, well-ordered patterns, while Roots grow faster than shoots, and explosive as they grow.",
        ),
        1,
      )
      .put(named_rule("B3/S4567", "Lifeguard 2"), 1)
      .put(
        named_rule(
          "B3/S45678",
          "Coral",
          "An exploding rule in which patterns grow slowly and form coral-like textures.",
        ),
        2,
      )
      .put(
        named_rule(
          "B34/S34",
          "3-4 Life",
          "An exploding rule that was initially thought to be a stable alternative to Conway's Life, until computer simulation found that most patterns tend to explode. It has many small oscillators and simple period 3 orthogonal and diagonal spaceships.",
        ),
        2,
      )
      .put(named_rule("B34/S35", "Dance"), 1)
      .put(named_rule("B34/S456", "Bacteria"), 1)
      .put(
        named_rule(
          "B345/S0456",
          "Never happy",
          "An explosive rule where patterns slowly form diamond-like shapes and slowly explode.",
        ),
        1,
      )
      .put(named_rule("B345/S2", "Blinkers"), 1)
      .put(
        named_rule(
          "B345/S4567",
          "Assimilation",
          "A very stable rule that forms permanent diamond-shaped patterns with partially filled interiors. Like in 2×2, patterns made of blocks will permanently remain made of blocks.",
        ),
        2,
      )
      .put(
        named_rule(
          "B345/S5",
          "Long Life",
          "A stable rule that gets its name from the fact that it has many simple extremely high period oscillators.",
        ),
        2,
      )
      .put(
        named_rule(
          "B34568/S15678",
          "Spiral and polygonal growth",
          'A rule with "plow" structures that move along an edge of a polygon, increasing its size (turning corners and thickening it as they go), corner-extenders that create these in their wake, and nontrivial interactions based on these (such as a 16-cell methuselah that takes 12127116559 generations to become a period-2 oscillator)',
        ),
        1,
      )
      .put(
        named_rule(
          "B3457/S4568",
          "Gems",
          "An exploding rule with many smaller high-period oscillators and a c/5648 spaceship.",
        ),
        2,
      )
      .put(
        named_rule(
          "B34578/S456",
          "Gems Minor",
          "An exploding rule with many smaller high-period oscillators and a c/2068 spaceship.",
        ),
        2,
      )
      .put(
        named_rule(
          "B35/S23",
          "Grounded Life",
          'A stable rule "one outer-totalistic condition away from Life", where neither of the standard spaceships works, and the most common spaceship is an orthogonal 2c/5 spaceship called "Glider 3736".',
        ),
        1,
      )
      .put(
        named_rule(
          "B35/S234578",
          "Land Rush",
          "Expanding chaos organizing itself into plowed fields.",
        ),
        1,
      )
      .put(
        named_rule(
          "B35/S236",
          "Eppstein",
          "An exploding rule explored by Dean Hickerson and David Eppstein.",
        ),
        1,
      )
      .put(
        named_rule(
          "B3567/S15678",
          "Bugs",
          "An explosive rule with many high density spaceships.",
        ),
        1,
      )
      .put(
        named_rule(
          "B35678/S34567",
          "Cheerios",
          'An explosive rule where patterns explode while "cheerios" form in the chaotic mess.',
        ),
        1,
      )
      .put(
        named_rule(
          "B35678/S4678",
          "Holstein",
          "A self-complementary rule. Black regions are surrounded by froth and tend to eventually collapse starting from the corners, but can be stabilized in various ways by oscillators on their boundaries. c/3, c/4, c/5 and c/7 orthogonal spaceships are known.",
        ),
        1,
      )
      .put(
        named_rule(
          "B35678/S5678",
          "Diamoeba",
          "A chaotic pattern that forms large diamonds with chaotically oscillating boundaries. Known to have quadratically-growing patterns. Like in 2×2, patterns made of blocks will permanently remain made of blocks.",
        ),
        2,
      )
      .put(
        named_rule(
          "B357/S1358",
          "Amoeba",
          "A chaotic rule that is well balanced between life and death; it forms patterns with chaotic interiors and wildly moving boundaries.",
        ),
        1,
      )
      .put(
        named_rule(
          "B357/S238",
          "Pseudo Life",
          "A chaotic rule with evolution that resembles Conway's Life, but few patterns from Life work in this rule because the glider is unstable.",
        ),
        1,
      )
      .put(
        named_rule(
          "B3578/S24678",
          "Geology",
          'A very well-balanced and chaotic rule that forms large "continents" of live cells surrounded by chaos at a roughly 50% density, but they eventually erode away into smaller "islands". It is symmetric under on-off reversal.',
        ),
        1,
      )
      .put(named_rule("B36/S12", "HighFlock"), 1)
      .put(
        named_rule(
          "B36/S125",
          "2×2",
          "A chaotic rule with many simple still lifes, oscillators and spaceships. Its name comes from the fact that it sends patterns made up of 2 × 2 blocks to patterns made up of 2 × 2 blocks.",
        ),
        2,
      )
      .put(named_rule("B36/S128", "IronFlock"), 1)
      .put(
        named_rule(
          "B36/S23",
          "HighLife",
          "A chaotic rule very similar to Conway's Life that is of interest because it has a simple replicator.",
        ),
        2,
      )
      .put(
        named_rule(
          "B36/S234578",
          "Land Rush 2",
          "An exploding rule that got confused with Land Rush, likely due to a typo. It does contain a period 4 orthogonal c/2 ship.",
        ),
        1,
      )
      .put(
        named_rule(
          "B36/S235",
          "Virus",
          "An exploding rule where the T-tetromino is a blinker puffer, appropriate because it evolves into traffic light in Life, also made of blinkers.",
        ),
        1,
      )
      .put(named_rule("B36/S238", "IronLife"), 1)
      .put(
        named_rule(
          "B36/S245",
          "sqrt replicator rule",
          "Name comes from a dirty orthogonal replicator, formerly known as the logarithmic replicator rule.",
        ),
        2,
      )
      .put(named_rule("B367/S125678", "Slow Blob"), 1)
      .put(
        named_rule(
          "B367/S23",
          "DrighLife",
          "A mix between DryLife and HighLife",
        ),
        1,
      )
      .put(named_rule("B3678/S1258", "2×2 2"), 1)
      .put(
        named_rule(
          "B3678/S135678",
          "Castles",
          "A rule where patterns almost explode into castle-like stable patterns.",
        ),
        1,
      )
      .put(
        named_rule(
          "B3678/S23",
          "B3678/S23",
          "Black/white reversal of InverseLife.",
        ),
        1,
      )
      .put(
        named_rule(
          "B3678/S235678",
          "Stains",
          'A stable rule in which most patterns tend to "fill in" bounded regions. Most nearby rules (such as coagulations) tend to explode.',
        ),
        2,
      )
      .put(
        named_rule(
          "B3678/S34678",
          "Day & Night",
          "A stable rule that is symmetric under on-off reversal. Many patterns exhibiting highly complex behavior have been found for it.",
        ),
        2,
      )
      .put(named_rule("B368/S012345678", "LowDeath without Death"), 1)
      .put(
        named_rule(
          "B368/S12578",
          "B368/S12578",
          "An exploding 2x2-like rule with a small 4c/13o replicator, of which guns and W110 unit cells had been constructed",
        ),
        1,
      )
      .put(named_rule("B368/S128", "LowFlockDeath"), 1)
      .put(
        named_rule(
          "B368/S236",
          "Life SkyHigh",
          'A rule that is similar to HighLife but adds a B8 and S6 to the rulestring, hence, the name "SkyHigh".',
        ),
        1,
      )
      .put(
        named_rule(
          "B368/S238",
          "LowDeath",
          "HighLife's replicator works in this rule, albeit with a different evolution sequence due to the result of B38/S23's \"pedestrian\" effect.",
        ),
        1,
      )
      .put(
        named_rule(
          "B368/S245",
          "Morley",
          'A rule in which random patterns tend to stabilize extremely quickly. Has a very common slow-moving spaceship and slow-moving puffer. Also known as "Move".',
        ),
        2,
      )
      .put(
        named_rule(
          "B37/S012345678",
          "DryLife without Death",
          "Similar to Life without death, but patterns tend to grow quadratically instead of forming 'ladders'.",
        ),
        1,
      )
      .put(named_rule("B37/S12", "DryFlock"), 1)
      .put(
        named_rule(
          "B37/S1234",
          "Mazectric with Mice",
          'Some "mice" run back and forth in the halls of the maze.',
        ),
        1,
      )
      .put(
        named_rule(
          "B37/S12345",
          "Maze with Mice",
          'Similar to B37/S1234, some "mice" run back and forth in the continually-stretching halls of the maze.',
        ),
        1,
      )
      .put(
        named_rule(
          "B37/S23",
          "DryLife",
          "An exploding rule closely related to Conway's Life, named after the fact that standard spaceships bigger than the glider do not function in the rule. Has a small 9c/28 orthogonal puffer based on the R-pentomino, which resembles the switch engine in the possibility of combining several to form a spaceship.",
        ),
        1,
      )
      .put(
        named_rule(
          "B378/S012345678",
          "Plow World",
          "An explosive rule, some of the patterns can turn into wickstretchers.",
        ),
        1,
      )
      .put(
        named_rule(
          "B378/S235678",
          "Coagulations",
          'An exploding rule in which patterns tend to expand forever, producing a thick "goo" as it does so. Surprisingly, Coagulations actually has one less birth condition than Stains.',
        ),
        2,
      )
      .put(named_rule("B38/S012345678", "Pedestrian Life without Death"), 1)
      .put(
        named_rule(
          "B38/S12",
          "Pedestrian Flock",
          "A mix between Pedestrian Life and Flock.",
        ),
        1,
      )
      .put(named_rule("B38/S128", "HoneyFlock"), 1)
      .put(
        named_rule(
          "B38/S23",
          "Pedestrian Life",
          "A close Life variant with a number of distinctive natural growth patterns and (5,2)c/190 oblique spaceships.",
        ),
        2,
      )
      .put(
        named_rule(
          "B38/S238",
          "HoneyLife",
          "A mix between Pedestrian Life and EightLife.",
        ),
        1,
      )
      .put(named_rule("B45/S12345", "Electrified Maze"), 1)
      .put(
        named_rule(
          "B45/S1235",
          "Oscillators Rule",
          'Random patterns shrink to tiny oscillators, with periods anywhere between 1 ("still lifes") and 16. Larger periods are rare.',
        ),
        1,
      )
      .put(
        named_rule(
          "B45678/S2345",
          "Walled cities",
          "A stable rule by David Macfarlane that forms centers of pseudo-random activity separated by walls.",
        ),
        2,
      )
      .put(named_rule("B45678/S5678", "Majority"), 1)
      .put(
        named_rule(
          "B4678/S35678",
          "Vote 4/5",
          'A modification of the standard Gérard Vichniac voting rule, also known as "Anneal", used as a model for majority voting.',
        ),
        2,
      )
      .put(named_rule("B48/S234", "Lifeguard 1"), 1)
      .put(
        named_rule(
          "B56/S14568",
          "Rings 'n' Slugs",
          'A rule in which patterns stabilize into "Rings" and "Slugs".',
        ),
        1,
      )
      .put(
        named_rule(
          "B5678/S45678",
          "Vote",
          'Standard Gérard Vichniac voting rule, also known as "Majority", used as a model for majority voting.',
        ),
        1,
      )
      .put(named_rule("R5,C2,M1,S34..58,B34..45,NM", "Bosco", "(aka Bugs) a chaotic rule by Kellie Evans."), 2)
      .put(named_rule("R10,C0,M1,S123..212,B123..170,NM", "Bugsmovie", "a chaotic rule by David Griffeath."), 2)
      .put(named_rule("R8,C0,M0,S163..223,B74..252,NM", "Globe", "an expanding rule by Mirek Wojtowicz."), 2)
      .put(named_rule("R1,C0,M1,S1..1,B1..1,NN", "Gnarl", "an exploding rule by Kellie Evans."), 2)
      .put(named_rule("R4,C0,M1,S41..81,B41..81,NM", "Majority", "a stable rule by David Griffeath."), 2)
      .put(named_rule("R7,C0,M1,S113..225,B113..225,NM", "Majorly", "an expanding rule by David Griffeath."), 2)
      .put(named_rule("R10,C255,M1,S2..3,B3..3,NM", "ModernArt", "a chaotic rule by Charles A. Rockafellor."), 2)
      .put(named_rule("R7,C0,M1,S100..200,B75..170,NM", "Waffle", "an expanding rule by Kellie Evans."), 2);

    // Random standard Moore (Life-like) rule
    let b_bits = Math.floor(Math.random() * 256);
    let s_bits = Math.floor(Math.random() * 256);
    let b = [];
    let s = [];
    for (let j = 1; j < 8; j++) {
      if ((b_bits >> j) & 1) b.push(j);
      if ((s_bits >> j) & 1) s.push(j);
    }
    let r_name = `b${b.join("")}/s${s.join("")}`;
    rulesets.put(named_rule(r_name, r_name), 1);

    // Random LtL Rule
    // Range 1 to 4
    // Neighborhoods: M, N, 2, C, +, X, *, B, D, #
    // Using aliases H (#), S (*), P (+) for URL safety
    let ltl_range = Math.floor(Math.random() * 4) + 1;
    let ltl_types = ["M", "N", "2", "C", "P", "X", "S", "H", "B", "D"];
    let ltl_type = ltl_types[Math.floor(Math.random() * ltl_types.length)];
    let ltl_include_center = Math.random() < 0.5;

    // Calculate max neighbors to determine valid born/survive range
    // Map aliases to real types for calculation
    let real_type = ltl_type;
    if (ltl_type === "H") real_type = "#";
    else if (ltl_type === "S") real_type = "*";
    else if (ltl_type === "P") real_type = "+";

    let max_n = get_max_neighbors(ltl_range, real_type, ltl_include_center);

    // Generate random born/survive ranges
    // For LtL, often defined as ranges e.g. B 30..40
    let b_ltl = [];
    let s_ltl = [];

    // Simple random generation: pick a few ranges
    let num_ranges = Math.floor(Math.random() * 2) + 1;
    for (let k = 0; k < num_ranges; k++) {
      let min = Math.floor(Math.random() * (max_n - 1)) + 1;
      let max = Math.min(
        max_n,
        min + Math.floor(Math.random() * (max_n - min) * 0.3),
      ); // 30% width max
      for (let j = min; j <= max; j++) b_ltl.push(j);
    }
    num_ranges = Math.floor(Math.random() * 2) + 1;
    for (let k = 0; k < num_ranges; k++) {
      let min = Math.floor(Math.random() * max_n);
      let max = Math.min(
        max_n,
        min + Math.floor(Math.random() * (max_n - min) * 0.3),
      );
      for (let j = min; j <= max; j++) s_ltl.push(j);
    }

    let ltl_states = 2;
    if (Math.random() < 0.1) {
      ltl_states = Math.floor(Math.random() * 30) + 3;
    }

    let ltl_name = `R${ltl_range},C${ltl_states},M${ltl_include_center ? 1 : 0},S${format_ranges(s_ltl)},B${format_ranges(b_ltl)},N${ltl_type}`;

    rulesets.put(parse_rule(ltl_name), 40); // Weight 2 for random LtL

    window.sub_animation_size = rulesets.size();

    if (window.forced_rule_string) {
      window.rules = parse_rule(window.forced_rule_string);
      console.log("Parsed forced rule:", window.rules);
    } else if (
      !isNaN(window.sub_animation_index) &&
      window.sub_animation_index >= 0 &&
      window.sub_animation_index < rulesets.size()
    ) {
      window.rules = rulesets.get_index(window.sub_animation_index);
    } else {
      window.rules = rulesets.sample();
    }

    // Apply topology/size overrides from rule
    if (window.rules.topology) {
      window.is_toroidal = window.rules.topology === "toroidal";
    }
    if (window.rules.width && window.rules.height) {
      window.columns = window.rules.width;
      window.rows = window.rules.height;
    }

    // Pre-calculate neighbor offsets for the ACTIVE rule
    window.neighbor_offsets = get_neighbor_offsets(
      window.rules.range,
      window.rules.type,
      window.rules.include_center,
    );

    // Tooltip Logic
    var rules_index = rulesets.index_of(window.rules);

    // Construct suffix: :Tcols,rows or :Pcols,rows
    var suffix_str = `:${window.is_toroidal ? "T" : "P"}${window.columns},${window.rows}`;
    var display_str = "";
    var link_rule_str = "";

    if (
      window.rules.range === 1 &&
      window.rules.type === "M" &&
      !window.rules.include_center &&
      (window.rules.states || 2) === 2
    ) {
      // Standard Life-like format
      var rule_str = `B${window.rules.born.join("")}/S${window.rules.survive.join("")}`;
      var name_str = window.rules.name.toLowerCase();

      var parenthetical = "";
      // If the name is the same as the rule string, or if it looks like an LtL definition (starts with 'r'),
      // just show the compact rule string.
      if (name_str !== rule_str.toLowerCase() && !name_str.startsWith("r")) {
        parenthetical = ` (${window.rules.name})`;
      }

      display_str = `${rule_str}${suffix_str}${parenthetical}`;
      link_rule_str = rule_str + suffix_str;
    } else {
      // LtL Format - Reconstruct canonical string
      // Map real types back to aliases if preferred? Or just standard chars.
      // Standard Golly uses #, +, etc. My aliases H, S, P were for input/URL.
      // Let's use standard chars for display.
      let type_char = window.rules.type;
      // Construct: Rr,Cc,Mm,Ss..s,Bb..b,Nn
      let s_part = format_ranges(window.rules.survive);
      let b_part = format_ranges(window.rules.born);
      let ltl_canon = `R${window.rules.range},C${window.rules.states || 2},M${window.rules.include_center ? 1 : 0},S${s_part},B${b_part},N${type_char}`;

      if (
        window.rules.name &&
        window.rules.name !== ltl_canon &&
        !window.rules.name.toUpperCase().startsWith("R")
      ) {
        display_str = `${ltl_canon}${suffix_str} (${window.rules.name})`;
      } else {
        display_str = `${ltl_canon}${suffix_str}`;
      }
      link_rule_str = ltl_canon + suffix_str;
    }

    tooltip(`2d automata<br>${display_str}`, rules_index, {
      rule: link_rule_str,
    });

    // Universe Initialization
    window.universe = new Array(window.rows * window.columns).fill(false);

    // Initial State Generation
    if (window.pause_at_generation === 1 && window.rules.born_set.has(1)) {
      let cx = Math.floor(window.columns / 2);
      let cy = Math.floor(window.rows / 2);
      window.universe[cy * window.columns + cx] = true;
    } else {
      // Generic Sampler
      var init_sampler = new ObjectSampler()
        .put("20p", 10)
        .put("50p", 4)
        .put("80p", 1)
        .put("rand_p", 3)
        .put("single", 1)
        .put("rect", 2)
        .put("circ", 2)
        .put("lines", 1)
        .put("simplex", 5);

      let range_substrate_valid = false;
      let min_rho = 0;
      let max_rho = 1;

      let max_n = window.neighbor_offsets.length;
      if (max_n > 0) {
        let all_counts = [...window.rules.born, ...window.rules.survive];
        if (all_counts.length > 0) {
          let min_k = Math.min(...all_counts);
          let max_k = Math.max(...all_counts);
          min_rho = min_k / max_n;
          max_rho = max_k / max_n;
          range_substrate_valid = true;
          let weight = window.rules.range >= 2 ? 200 : 5;
          init_sampler.put("range_substrate", weight);
        }
      }

      if (window.rules.name === "Life") {
        init_sampler.put("glider", 1).put("gun", 1);
      }

      let choice = init_sampler.sample();

      if (choice === "20p") {
        for (let i = 0; i < window.universe.length; i++)
          window.universe[i] = Math.random() < 0.2;
      } else if (choice === "50p") {
        for (let i = 0; i < window.universe.length; i++)
          window.universe[i] = Math.random() < 0.5;
      } else if (choice === "80p") {
        for (let i = 0; i < window.universe.length; i++)
          window.universe[i] = Math.random() < 0.8;
      } else if (choice === "rand_p") {
        let p = Math.random();
        for (let i = 0; i < window.universe.length; i++)
          window.universe[i] = Math.random() < p;
      } else if (choice === "range_substrate") {
        let rho = min_rho + Math.random() * (max_rho - min_rho);
        for (let i = 0; i < window.universe.length; i++)
          window.universe[i] = Math.random() < rho;
      } else if (choice === "simplex") {
        init_simplex_noise();
        let freq = Math.random() * 0.1 + 0.05;
        for (var y = 0; y < window.rows; y++) {
          for (var x = 0; x < window.columns; x++) {
            let val = get_simplex_noise_at([x, y], freq, 1);
            if (val > 0) {
              window.universe[y * window.columns + x] = true;
            }
          }
        }
      } else if (choice === "single") {
        let cx = Math.floor(window.columns / 2);
        let cy = Math.floor(window.rows / 2);
        window.universe[cy * window.columns + cx] = true;
      } else if (choice === "rect") {
        // Rectangle fitting in viewport
        let w = Math.floor(Math.random() * (window.columns - 2)) + 1;
        let h = Math.floor(Math.random() * (window.rows - 2)) + 1;
        let x = Math.floor(Math.random() * (window.columns - w));
        let y = Math.floor(Math.random() * (window.rows - h));
        let filled = Math.random() < 0.5;

        for (let j = y; j < y + h; j++) {
          for (let i = x; i < x + w; i++) {
            if (
              filled ||
              j === y ||
              j === y + h - 1 ||
              i === x ||
              i === x + w - 1
            ) {
              window.universe[j * window.columns + i] = true;
            }
          }
        }
      } else if (choice === "circ") {
        let radius =
          Math.floor(
            Math.random() * (Math.min(window.rows, window.columns) / 2 - 2),
          ) + 1;
        let cx =
          Math.floor(Math.random() * (window.columns - 2 * radius)) + radius;
        let cy =
          Math.floor(Math.random() * (window.rows - 2 * radius)) + radius;
        let filled = Math.random() < 0.5;

        if (filled) {
          let r2 = radius * radius;
          for (let j = cy - radius; j <= cy + radius; j++) {
            for (let i = cx - radius; i <= cx + radius; i++) {
              if ((i - cx) ** 2 + (j - cy) ** 2 <= r2) {
                if (j >= 0 && j < window.rows && i >= 0 && i < window.columns)
                  window.universe[j * window.columns + i] = true;
              }
            }
          }
        } else {
          let pts = get_bresenham_circle_points(cx, cy, radius);
          for (let pt of pts) {
            let px = pt[0],
              py = pt[1];
            if (py >= 0 && py < window.rows && px >= 0 && px < window.columns)
              window.universe[py * window.columns + px] = true;
          }
        }
      } else if (choice === "lines") {
        let num_lines = Math.floor(Math.random() * 10) + 1;
        for (let k = 0; k < num_lines; k++) {
          let x0 = Math.floor(Math.random() * window.columns);
          let y0 = Math.floor(Math.random() * window.rows);
          let x1 = Math.floor(Math.random() * window.columns);
          let y1 = Math.floor(Math.random() * window.rows);
          let pts = get_bresenham_line_points([
            [x0, y0],
            [x1, y1],
          ]);
          for (let pt of pts) {
            let px = pt[0],
              py = pt[1];
            if (py >= 0 && py < window.rows && px >= 0 && px < window.columns)
              window.universe[py * window.columns + px] = true;
          }
        }
      } else if (choice === "glider") {
        let cx = Math.floor(window.columns / 2);
        let cy = Math.floor(window.rows / 2);
        let offsets = [
          [0, -1],
          [1, 0],
          [-1, 1],
          [0, 1],
          [1, 1],
        ];
        for (let off of offsets) {
          let idx = (cy + off[1]) * window.columns + (cx + off[0]);
          if (idx >= 0 && idx < window.universe.length)
            window.universe[idx] = true;
        }
      } else if (choice === "gun") {
        let cx = Math.floor(window.columns / 2);
        let cy = Math.floor(window.rows / 2);
        // Gosper Glider Gun (Top-Left aligned relative to center)
        // 36x9
        let gun_str = [
          "........................O...........",
          "......................O.O...........",
          "............OO......OO............OO",
          "...........O...O....OO............OO",
          "OO........O.....O...OO..............",
          "OO........O...O.OO....O.O...........",
          "..........O.....O.......O...........",
          "...........O...O....................",
          "............OO......................",
        ];
        // Center the gun
        let start_y = cy - 4;
        let start_x = cx - 18;
        for (let i = 0; i < gun_str.length; i++) {
          for (let j = 0; j < gun_str[i].length; j++) {
            if (gun_str[i][j] === "O") {
              let y = start_y + i;
              let x = start_x + j;
              if (x >= 0 && x < window.columns && y >= 0 && y < window.rows) {
                window.universe[y * window.columns + x] = true;
              }
            }
          }
        }
      }
    }

    window.tile_rules = [];
    const C = window.rules.states || 2;
    if (C > 2) {
      // Multi-state palette: . for 0, then 1234567890 repeating
      window.tile_rules = ["."];
      const palette = "1234567890";
      for (let i = 1; i < C; i++) {
        window.tile_rules.push(palette[(i - 1) % palette.length]);
      }
    } else {
      // Default binary look
      window.tile_rules = [".", "o"];
    }
  }

  // Render current state
  var full_text = "";
  for (var y = 0; y < window.rows; y++) {
    for (var x = 0; x < window.columns; x++) {
      let idx = y * window.columns + x;
      // Number() cast handles both boolean (false->0, true->1) and integer states
      full_text += window.tile_rules[Number(window.universe[idx])];
    }
    full_text += "\n";
  }
  window.canvas.text(full_text);

  if (
    typeof window.pause_at_generation !== "undefined" &&
    window.frame_count === window.pause_at_generation
  ) {
    return;
  }

  // Calculate next generation
  var next_universe = new Array(window.universe.length).fill(0);

  // Cache globals for loop
  const rows = window.rows;
  const cols = window.columns;
  const is_toroidal = window.is_toroidal;
  const offsets = window.neighbor_offsets;
  const born_set = window.rules.born_set;
  const survive_set = window.rules.survive_set;
  const universe = window.universe;
  const num_states = window.rules.states || 2;

  for (var y = 0; y < rows; y++) {
    for (var x = 0; x < cols; x++) {
      var neighbors = 0;

      for (let i = 0; i < offsets.length; i++) {
        let off = offsets[i];
        let nx = x + off[0];
        let ny = y + off[1];

        if (is_toroidal) {
          // Modulo arithmetic for wrapping
          nx = ((nx % cols) + cols) % cols;
          ny = ((ny % rows) + rows) % rows;
        } else {
          if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
        }

        let n_idx = ny * cols + nx;
        // For multi-state (Generations), only state 1 counts as neighbor
        if (num_states > 2) {
          if (universe[n_idx] == 1) neighbors++;
        } else {
          if (universe[n_idx]) neighbors++;
        }
      }

      var idx = y * cols + x;
      var state = Number(universe[idx]);

      if (state === 0) {
        if (born_set.has(neighbors)) {
          next_universe[idx] = 1;
        }
      } else if (state === 1) {
        if (survive_set.has(neighbors)) {
          next_universe[idx] = 1;
        } else {
          // Death or Decay
          next_universe[idx] = num_states > 2 ? 2 : 0;
        }
      } else {
        // Refractory / Decay
        next_universe[idx] = (state + 1) % num_states;
      }
    }
  }

  window.universe = next_universe;

  window.frame_count++;
  setTimeout(this_animation.bind(null, this_animation), 100);
};
