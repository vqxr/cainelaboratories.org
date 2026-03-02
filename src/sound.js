import * as Tone from 'tone';

class SoundManager {
    constructor() {
        this.initialized = false;
        this.muted = true;

        // Space/Reverb for everything
        this.reverb = new Tone.Reverb({
            decay: 5,
            preDelay: 0.1,
            wet: 0.4
        }).toDestination();

        // Main Ambient drone - Upgraded with FM and Better Envelope
        this.ambientSynth = new Tone.PolySynth(Tone.FMSynth, {
            harmonicity: 3.01,
            modulationIndex: 14,
            oscillator: { type: "sine" },
            envelope: { attack: 4, decay: 0.3, sustain: 1, release: 5 },
            modulation: { type: "sine" },
            modulationEnvelope: { attack: 1.5, decay: 0, sustain: 1, release: 0.5 }
        }).connect(this.reverb);

        // Filter for movement
        this.filter = new Tone.Filter({
            type: "lowpass",
            frequency: 800,
            rolloff: -24,
            Q: 1
        }).connect(this.reverb);
        this.ambientSynth.connect(this.filter);

        // Effects synth
        this.fxSynth = new Tone.MembraneSynth({
            pitchDecay: 0.05,
            octaves: 10,
            oscillator: { type: "sine" },
            envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 }
        }).toDestination();

        // High frequency synth for clicks/pings - Upgraded for more "glassy" feel
        this.pingSynth = new Tone.MetalSynth({
            frequency: 800,
            envelope: { attack: 0.001, decay: 0.3, release: 0.1 },
            harmonicity: 5.1,
            modulationIndex: 40,
            resonance: 6000,
            octaves: 2.5
        }).connect(this.reverb);
        this.pingSynth.volume.value = -12;

        // Ultra-short, dry click for UI hovers
        this.tickSynth = new Tone.MetalSynth({
            frequency: 200,
            envelope: { attack: 0.001, decay: 0.01, release: 0.01 },
            harmonicity: 3,
            modulationIndex: 10,
            resonance: 2000,
            octaves: 0.5
        }).toDestination();
        this.tickSynth.volume.value = -24;

        this.ambientSynth.volume.value = -18;
    }

    async init() {
        if (this.initialized) return;
        try {
            await Tone.start();
            this.initialized = true;
            this.muted = false;
            Tone.Destination.mute = false;

            // Start base ambient drone
            Tone.Transport.start();
            this.playAmbientChord(["C2", "G2", "C3"]);

            // Initial filter swell for impact
            this.filter.frequency.rampTo(2000, 2);

            console.log("Audio Engine Ready");
        } catch (e) {
            console.error("Audio init failed:", e);
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        Tone.Destination.mute = this.muted;
        if (!this.muted && !this.initialized) {
            this.init();
        }
        return this.muted;
    }

    playAmbientChord(notes) {
        if (!this.initialized || this.muted) return;
        this.ambientSynth.releaseAll();
        this.ambientSynth.triggerAttack(notes);
        // Subtle filter modulation
        this.filter.frequency.rampTo(1200 + Math.random() * 800, 3);
    }

    playHeartbeat() {
        if (!this.initialized || this.muted) return;
        this.fxSynth.triggerAttackRelease("C1", "8n");
        setTimeout(() => this.fxSynth.triggerAttackRelease("C1", "8n"), 200);
    }

    playUITick() {
        if (!this.initialized || this.muted) return;
        this.tickSynth.triggerAttackRelease("C6", "64n");
    }

    playClick() {
        if (!this.initialized || this.muted) return;
        this.pingSynth.triggerAttackRelease("32n");
    }

    playPing() {
        if (!this.initialized || this.muted) return;
        const synth = new Tone.FMSynth({
            harmonicity: 8,
            modulationIndex: 20,
            oscillator: { type: 'sine' },
            envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.2 }
        }).connect(this.reverb);
        synth.volume.value = -10;
        synth.triggerAttackRelease("G5", "16n");
    }

    playTensionBuild() {
        if (!this.initialized || this.muted) return;
        let p = 0;
        const notes = ["C3", "D3", "E3", "G3", "A3", "C4", "D4", "E4", "G4"];

        if (this.tensionLoop) {
            Tone.Transport.clear(this.tensionLoop);
        }

        this.tensionLoop = Tone.Transport.scheduleRepeat((time) => {
            if (p < notes.length) {
                this.ambientSynth.triggerAttackRelease(notes[p], "8n", time);
                // Ramp filter up with tension
                this.filter.frequency.exponentialRampTo(800 + (p * 400), "8n");
                p++;
            } else {
                p = 0; // Loop or just wait
            }
        }, "4n");
    }

    stopTension() {
        if (this.tensionLoop) {
            Tone.Transport.clear(this.tensionLoop);
        }
        this.filter.frequency.rampTo(800, 1);
    }

    playClimax() {
        if (!this.initialized || this.muted) return;
        this.stopTension();
        this.ambientSynth.releaseAll();

        const feedbackDelay = new Tone.FeedbackDelay("8n", 0.5).toDestination();
        const climaxSynth = new Tone.PolySynth(Tone.Synth).connect(feedbackDelay);

        climaxSynth.triggerAttackRelease(["C3", "E3", "G3", "C4", "E4"], "2n");
        this.filter.frequency.rampTo(4000, 0.1);

        setTimeout(() => {
            climaxSynth.dispose();
            feedbackDelay.dispose();
        }, 3000);
    }

    playResolvedAmbient() {
        if (!this.initialized || this.muted) return;
        this.ambientSynth.releaseAll();
        this.ambientSynth.triggerAttack(["F2", "C3", "A3", "C4"]);
        this.filter.frequency.rampTo(1000, 4);
    }
}

export const soundManager = new SoundManager();
