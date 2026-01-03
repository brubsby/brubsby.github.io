import { tooltip, roundFloat, ObjectSampler } from '../utils.js';

const idiv = (a, b) => (b === 0) ? 0 : (a / b) | 0;

// hope - pitch OK
// from http://royal-paw.com/2012/01/bytebeats-in-c-and-python-generative-symphonies-from-extremely-small-programs/
// (atmospheric, hopeful)
// sample = ( ( ((t_*3) & ((t_*pitch)>>10)) | ((t_*p0) & ((t_*pitch)>>10)) | ((t_*10) & (((t_*pitch)>>8)*p1) & p2) ) & 0xFF);
// sample = ( ( ((t_*3) & ((t_*pitch)>>10)) | ((t_*p0) & ((t_*pitch)>>10)) | ((t_*10) & ((t_>>8)*p1) & p2) ) & 0xFF);
var hope = (t_, pitch, p0, p1, p2, last_sample_) => (( (((t_*pitch)*3) & (t_>>10)) | (((t_*pitch)*p0) & (t_>>10)) | ((t_*10) & (idiv(t_, 256)*p1) & p2) ) & 0xFF);
// love - pitch OK
// equation by stephth via https://www.youtube.com/watch?v=tCRPUv8V22o at 3:38
var love = (t_, pitch, p0, p1, p2, last_sample_) => (((((t_*pitch)*p0) & (t_>>4)) | ((t_*p2) & (t_>>7)) | ((t_*p1) & (t_>>10))) & 0xFF);
// life - pitch OK
// This one is the second one listed at from http://xifeng.weebly.com/bytebeats.html
var life = ((t_, pitch, p0, p1, p2, last_sample_) => (( ((((((t_*pitch) >> p0) | (t_*pitch)) | ((t_*pitch) >> p0)) * p2) & ((5 * (t_*pitch)) | ((t_*pitch) >> p2)) ) | ((t_*pitch) ^ (t_ % p1)) ) & 0xFF));
// age - pitch disabled
// Arp rotator (equation 9 from Equation Composer Ptah bank)
var age = (t_, pitch, p0, p1, p2, last_sample_) => (t_ >>> (p2 >> 4)) & idiv(t_ << 3, ((t_ * p1 * (t_ >>> 11)) >>> 0) % (3 + ((t_ >>> (16 - (p0 >> 4))) % 22)));
// clysm - pitch almost no effect
//  BitWiz Transplant via Equation Composer Ptah bank 
var clysm = (t_, pitch, p0, p1, p2, last_sample_) => ((t_*pitch)-(((t_*pitch)&p0)*p1-1668899)*(((t_*pitch)>>15)%15*(t_*pitch)))>>(((t_*pitch)>>12)%16)>>(p2%15);
// monk - pitch OK
// Vocaliser from Equation Composer Khepri bank         
var monk = (t_, pitch, p0, p1, p2, last_sample_) => (((t_*pitch)%p0>>2)&p1)*(t_>>(p2>>5));
// NERV - horrible!
// Chewie from Equation Composer Khepri bank         
var nerv = (t_, pitch, p0, p1, p2, last_sample_) => idiv((p0-(idiv((p2+1),(t_*pitch))^p0|(t_*pitch)^922+p0))*(p2+1), p0)*(((t_*pitch)+p1)>>p1%19);
// Trurl - pitch OK
// Tinbot from Equation Composer Sobek bank   
var trurl = (t_, pitch, p0, p1, p2, last_sample_) => (idiv((t_*pitch),(40+p0))*((t_*pitch)+(t_*pitch)|4-(p1+20)))+((t_*pitch)*(p2>>5));
// Pirx  - pitch OK
// My Loud Friend from Equation Composer Ptah bank   
var pirx = (t_, pitch, p0, p1, p2, last_sample_) => idiv((((t_*pitch)>>((p0>>12)%12))%(t_>>((p1%12)+1))-(t_>>((t_>>(p2%10))%12))), (idiv(t_, ((p0>>2)%15))%15))<<4;
//Snaut
// GGT2 from Equation Composer Ptah bank
// sample = ((p0|(t_>>(t_>>13)%14))*((t_>>(p0%12))-p1&249))>>((t_>>13)%6)>>((p2>>4)%12);
// "A bit high-frequency, but keeper anyhow" from Equation Composer Khepri bank.
var snaut = (t_, pitch, p0, p1, p2, last_sample_) => ((t_*pitch)+last_sample_+idiv(p1,p0))%(p0|(t_*pitch)+p2);
// Hari
// The Signs, from Equation Composer Ptah bank
var hari = (t_, pitch, p0, p1, p2, last_sample_) => ((0&(251&(idiv((t_*pitch),(100+p0)))))|((idiv(last_sample_,(t_*pitch))|(idiv((t_*pitch),(100*(p1+1)))))*((t_*pitch)|p2)));
// Kris - pitch OK
// Light Reactor from Equation Composer Ptah bank
var kris = (t_, pitch, p0, p1, p2, last_sample_) => (((t_*pitch)>>3)*(p0-643|(325%t_|p1)&t_)-(idiv((t_>>6)*35,p2)%t_))>>6;
// Tichy
var tichy = (t_, pitch, p0, p1, p2, last_sample_) => (t_*pitch)>>7 & t_>>7 | t_>>8;
// Alpha from Equation Composer Khepri bank
// sample = ((((t_*pitch)^(p0>>3)-456)*(p1+1))/((((t_*pitch)>>(p2>>3))%14)+1))+((t_*pitch)*((182>>((t_*pitch)>>15)%16))&1) ;
// Bregg - pitch OK
// Hooks, from Equation Composer Khepri bank.
var bregg = (t_, pitch, p0, p1, p2, last_sample_) => ((t_*pitch)&(p0+2))-idiv(idiv(idiv(t_,p1),last_sample_),p2);
// Avon - pitch OK
// Widerange from Equation Composer Khepri bank
var avon = (t_, pitch, p0, p1, p2, last_sample_) => (((p0^((t_*pitch)>>(p1>>3)))-(t_>>(p2>>2))-t_%(t_&p1)));
// Orac
// Abducted, from Equation Composer Ptah bank
var orac = (t_, pitch, p0, p1, p2, last_sample_) => (p0+(t_*pitch)>>p1%12)|((last_sample_%(p0+(t_*pitch)>>p0%4))+11+p2^t_)>>(p2>>12);

const equations = [
    [hope, "hope"],
    [love, "love"],
    [life, "life"],
    [age, "age"],
    [clysm, "clysm"],
    [monk, "monk"],
    [nerv, "NERV"],
    [trurl, "Trurl"],
    [pirx, "Pirx"],
    [snaut, "Snaut"],
    [hari, "Hari"],
    [kris, "Kris"],
    [tichy, "Tichy"],
    [bregg, "Bregg"],
    [avon, "Avon"],
    [orac, "Orac"]
];

function reverse_byte(b) {
    return ((b & 0x1)  << 7) | ((b & 0x2)  << 5) |
           ((b & 0x4)  << 3) | ((b & 0x8)  << 1) |
           ((b & 0x10) >> 1) | ((b & 0x20) >> 3) |
           ((b & 0x40) >> 5) | ((b & 0x80)  >> 7);
}

export default (this_animation) => {
    // Initialization
    if (window.frame_count === 0) {
        window.bytebeat_t = 0;
        
        // Random parameters
        const speed_sampler = new ObjectSampler()
            .put(Math.floor(Math.random() * (window.columns / 2)) + 1, 1)
	    .put(Math.floor((Math.random()*8)+1)*2, 1)
            .put(1, 1);

	window.bytebeat_speed = speed_sampler.sample();
        window.bytebeat_pitch = Math.floor(Math.random() * 255) + 1; // 1-255
        window.bytebeat_p0 = Math.floor(Math.random() * 256);
        window.bytebeat_p1 = Math.floor(Math.random() * 256);
        window.bytebeat_p2 = Math.floor(Math.random() * 256);

        // Select equations
        // Determine how many fit vertically
        const strip_height = 16;
        const num_strips = Math.floor(window.rows / strip_height);
        
        window.bytebeat_active_equations = [];
        window.bytebeat_histories = [];
        window.bytebeat_last_samples = []; // For equations that need state (Snaut, Hari, Orac)

        // Shuffle equations to pick random unique ones
        const shuffled_eqs = [...equations];
        for (let i = shuffled_eqs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled_eqs[i], shuffled_eqs[j]] = [shuffled_eqs[j], shuffled_eqs[i]];
        }

        // Fill the strips
        for (let i = 0; i < num_strips; i++) {
            // Cycle through shuffled equations if we need more than available (unlikely with 16 eqs and normal screens)
            const eq_data = shuffled_eqs[i % shuffled_eqs.length];
            window.bytebeat_active_equations.push(eq_data);
            
            // History buffer for visualization (needs to cover the screen width expansion)
            // O_C uses 64 history depth for 128 width (expanding outwards).
            // We need enough history to cover from center to edge.
            // Max width expansion is approx window.columns / 2.
            const required_depth = Math.ceil(window.columns / 2) + 10; // +10 safety padding
            window.bytebeat_histories.push(new Uint8Array(required_depth).fill(0));
            window.bytebeat_last_samples.push(13);
        }

        const equation_names = window.bytebeat_active_equations.map(eq => eq[1].toLowerCase()).join('<br>');
        tooltip(`bytebeat<br>${equation_names}<br>speed=${window.bytebeat_speed} pitch=${window.bytebeat_pitch} p0=${window.bytebeat_p0} p1=${window.bytebeat_p1} p2=${window.bytebeat_p2}`);
    }

    const strip_height = 16;
    const num_strips = window.bytebeat_active_equations.length;
    const start_row = Math.floor((window.rows - num_strips * strip_height) / 2);
    const center_col = Math.floor(window.columns / 2);
    const is_odd_width = (window.columns % 2) !== 0;

    // Advance time and history
    const steps = window.bytebeat_speed;
    for (let s = 0; s < steps; s++) {
        window.bytebeat_t++;

        for (let i = 0; i < num_strips; i++) {
            const [func, name] = window.bytebeat_active_equations[i];
            const history = window.bytebeat_histories[i];
            let last_sample = window.bytebeat_last_samples[i];

            let sample = func(window.bytebeat_t, window.bytebeat_pitch, window.bytebeat_p0, window.bytebeat_p1, window.bytebeat_p2, last_sample);
            sample = sample & 0xFF; // Ensure 8-bit
            window.bytebeat_last_samples[i] = sample;

            // Shift history and add new sample at the end (newest)
            history.copyWithin(0, 1);
            history[history.length - 1] = sample;
        }
    }

    // Prepare grid
    let text_grid = [];
    for (let r = 0; r < window.rows; r++) {
        text_grid[r] = new Array(window.columns).fill('.');
    }

    // Process each strip
    for (let i = 0; i < num_strips; i++) {
        const history = window.bytebeat_histories[i];
        const base_y = start_row + i * strip_height;

        // Draw this strip
        // We iterate outwards from center.
        
        const max_dist = Math.ceil(window.columns / 2);
        
        for (let dist = 0; dist < max_dist; dist++) {
            // Get sample from history (newest is at end)
            // If we run out of history, we just use 0 (or oldest available)
            const hist_idx = history.length - 1 - dist;
            if (hist_idx < 0) break; 
            
            const b = history[hist_idx];
            const b_rev = reverse_byte(b);

            // Determine X coordinates
            let x_left, x_right;

            if (is_odd_width) {
                if (dist === 0) {
                    x_left = center_col;
                    x_right = center_col;
                } else {
                    x_left = center_col - dist;
                    x_right = center_col + dist;
                }
            } else {
                // Even width
                // center line is between center_col-1 and center_col
                // dist 0: center_col-1 and center_col
                x_left = center_col - 1 - dist;
                x_right = center_col + dist;
            }

            // Draw Vertical Columns
            // Top 8 pixels (base_y to base_y + 7): Bit Reversed
            // Bottom 8 pixels (base_y + 8 to base_y + 15): Normal
            
            // Optimization: Pre-calculate the characters for the column since left/right are symmetric
            // except for odd-width center which is just one column.
            
            // Top half (Bit Reversed)
            // O_C: graphics.drawAlignedByte(..., base_y, b_rev)
            // This means pixel at base_y+0 is LSB of b_rev (which is MSB of b), etc.
            // Wait, weegfx setPixel(x, y) implementation:
            // *(get_frame_ptr(x, y)) |= (0x1 << (y & 0x7));
            // drawAlignedByte: *get_frame_ptr(x, y) = byte;
            // This means the byte writes directly to video memory where bit 0 is top pixel of the 8-pixel block?
            // "y & 0x7" implies 0 is first bit.
            // So: byte & 1 is at y, byte & 2 is at y+1, ... byte & 128 is at y+7.
            // Yes.
            
            for (let bit = 0; bit < 8; bit++) {
                // Top half: reversed byte
                const pixel_on_top = (b_rev >> bit) & 1;
                const char_top = pixel_on_top ? 'o' : '.';
                
                if (x_left >= 0 && x_left < window.columns) text_grid[base_y + bit][x_left] = char_top;
                if (x_right >= 0 && x_right < window.columns) text_grid[base_y + bit][x_right] = char_top;

                // Bottom half: normal byte
                const pixel_on_bot = (b >> bit) & 1;
                const char_bot = pixel_on_bot ? 'o' : '.';
                
                if (x_left >= 0 && x_left < window.columns) text_grid[base_y + 8 + bit][x_left] = char_bot;
                if (x_right >= 0 && x_right < window.columns) text_grid[base_y + 8 + bit][x_right] = char_bot;
            }
        }
    }

    // Convert grid to string
    let text = text_grid.map(row => row.join('')).join('\n');
    window.canvas.text(text);

    window.frame_count++;
    setTimeout(this_animation.bind(null, this_animation), 20); // 20 FPS
}
