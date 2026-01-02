          // hope - pitch OK
          // from http://royal-paw.com/2012/01/bytebeats-in-c-and-python-generative-symphonies-from-extremely-small-programs/
          // (atmospheric, hopeful)
          // sample = ( ( ((t_*3) & ((t_*pitch)>>10)) | ((t_*p0) & ((t_*pitch)>>10)) | ((t_*10) & (((t_*pitch)>>8)*p1) & p2) ) & 0xFF);
          // sample = ( ( ((t_*3) & ((t_*pitch)>>10)) | ((t_*p0) & ((t_*pitch)>>10)) | ((t_*10) & ((t_>>8)*p1) & p2) ) & 0xFF);
          var hope = (t_,pitch,p0,p1,p2,last_sample_) => (( (((t_*pitch)*3) & (t_>>10)) | (((t_*pitch)*p0) & (t_>>10)) | ((t_*10) & ((t_>>8)*p1) & p2) ) & 0xFF);
          // love - pitch OK
          // equation by stephth via https://www.youtube.com/watch?v=tCRPUv8V22o at 3:38
          var love = (t_,pitch,p0,p1,p2,last_sample_) => (((((t_*pitch)*p0) & (t_>>4)) | ((t_*p2) & (t_>>7)) | ((t_*p1) & (t_>>10))) & 0xFF);
          // life - pitch OK
          // This one is the second one listed at from http://xifeng.weebly.com/bytebeats.html
          var life = ((t_,pitch,p0,p1,p2,last_sample_) => (( ((((((t_*pitch) >> p0) | (t_*pitch)) | ((t_*pitch) >> p0)) * p2) & ((5 * (t_*pitch)) | ((t_*pitch) >> p2)) ) | ((t_*pitch) ^ (t_ % p1)) ) & 0xFF));
          // age - pitch disabled
          // Arp rotator (equation 9 from Equation Composer Ptah bank)
          var age = ((t_,pitch,p0,p1,p2,last_sample_) => ((t_)>>(p2>>4))&((t_)<<3)/((t_)*p1*((t_)>>11)%(3+(((t_)>>(16-(p0>>4)))%22))));
          // clysm - pitch almost no effect
          //  BitWiz Transplant via Equation Composer Ptah bank 
          var clysm = (t_,pitch,p0,p1,p2,last_sample_) => ((t_*pitch)-(((t_*pitch)&p0)*p1-1668899)*(((t_*pitch)>>15)%15*(t_*pitch)))>>(((t_*pitch)>>12)%16)>>(p2%15);
          // monk - pitch OK
          // Vocaliser from Equation Composer Khepri bank         
          var monk = (t_,pitch,p0,p1,p2,last_sample_) => (((t_*pitch)%p0>>2)&p1)*(t_>>(p2>>5));
          // NERV - horrible!
          // Chewie from Equation Composer Khepri bank         
          var nerv = (t_,pitch,p0,p1,p2,last_sample_) => (p0-(((p2+1)/(t_*pitch))^p0|(t_*pitch)^922+p0))*(p2+1)/p0*(((t_*pitch)+p1)>>p1%19);
          // Trurl - pitch OK
          // Tinbot from Equation Composer Sobek bank   
          var trurl = (t_,pitch,p0,p1,p2,last_sample_) => ((t_*pitch)/(40+p0)*((t_*pitch)+(t_*pitch)|4-(p1+20)))+((t_*pitch)*(p2>>5));
          // Pirx  - pitch OK
          // My Loud Friend from Equation Composer Ptah bank   
          var pirx = (t_,pitch,p0,p1,p2,last_sample_) => ((((t_*pitch)>>((p0>>12)%12))%(t_>>((p1%12)+1))-(t_>>((t_>>(p2%10))%12)))/((t_>>((p0>>2)%15))%15))<<4;
          //Snaut
          // GGT2 from Equation Composer Ptah bank
          // sample = ((p0|(t_>>(t_>>13)%14))*((t_>>(p0%12))-p1&249))>>((t_>>13)%6)>>((p2>>4)%12);
          // "A bit high-frequency, but keeper anyhow" from Equation Composer Khepri bank.
          var snaut = (t_,pitch,p0,p1,p2,last_sample_) => ((t_*pitch)+last_sample_+p1/p0)%(p0|(t_*pitch)+p2);
          // Hari
          // The Signs, from Equation Composer Ptah bank
          var hari = (t_,pitch,p0,p1,p2,last_sample_) => ((0&(251&((t_*pitch)/(100+p0))))|((last_sample_/(t_*pitch)|((t_*pitch)/(100*(p1+1))))*((t_*pitch)|p2)));
          // Kris - pitch OK
          // Light Reactor from Equation Composer Ptah bank
          var kris = (t_,pitch,p0,p1,p2,last_sample_) => (((t_*pitch)>>3)*(p0-643|(325%t_|p1)&t_)-((t_>>6)*35/p2%t_))>>6;
          // Tichy
          var tichy = (t_,pitch,p0,p1,p2,last_sample_) => (t_*pitch)>>7 & t_>>7 | t_>>8;
          // Alpha from Equation Composer Khepri bank
          // sample = ((((t_*pitch)^(p0>>3)-456)*(p1+1))/((((t_*pitch)>>(p2>>3))%14)+1))+((t_*pitch)*((182>>((t_*pitch)>>15)%16))&1) ;
          // Bregg - pitch OK
          // Hooks, from Equation Composer Khepri bank.
          var bregg = (t_,pitch,p0,p1,p2,last_sample_) => ((t_*pitch)&(p0+2))-(t_/p1)/last_sample_/p2;
          // Avon - pitch OK
          // Widerange from Equation Composer Khepri bank
          var avon = (t_,pitch,p0,p1,p2,last_sample_) => (((p0^((t_*pitch)>>(p1>>3)))-(t_>>(p2>>2))-t_%(t_&p1)));
          // Orac
          // Abducted, from Equation Composer Ptah bank
          var orac = (t_,pitch,p0,p1,p2,last_sample_) => (p0+(t_*pitch)>>p1%12)|((last_sample_%(p0+(t_*pitch)>>p0%4))+11+p2^t_)>>(p2>>12);
