import * as Tone from 'tone';

class SoundManager {
    constructor() {
        this.initialized = false;
        this.muted = true;

        // Base ambient track
        this.ambientSynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "sine" },
            envelope: { attack: 2, decay: 1, sustain: 1, release: 4 }
        }).toDestination();

        // Effects synth
        this.fxSynth = new Tone.MembraneSynth().toDestination();

        // High frequency synth for clicks/pings
        this.pingSynth = new Tone.MetalSynth({
            frequency: 400,
            envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
            harmonicity: 5.1,
            modulationIndex: 32,
            resonance: 4000,
            octaves: 1.5
        }).toDestination();
        this.pingSynth.volume.value = -10;

        // Add some reverb for space
        this.reverb = new Tone.Reverb(4).toDestination();
        this.ambientSynth.connect(this.reverb);

        this.ambientSynth.volume.value = -15;
    }

    async init() {
        if (this.initialized) return;
        await Tone.start();
        this.initialized = true;
        this.muted = false;

        // Start base ambient drone
        Tone.Transport.start();
        this.playAmbientChord(["C2", "G2"]);
    }

    toggleMute() {
        this.muted = !this.muted;
        Tone.Destination.mute = this.muted;
        return this.muted;
    }

    playAmbientChord(notes) {
        if (!this.initialized || this.muted) return;
        // Release previous
        this.ambientSynth.releaseAll();
        // Play new
        this.ambientSynth.triggerAttack(notes);
    }

    playHeartbeat() {
        if (!this.initialized || this.muted) return;
        this.fxSynth.triggerAttackRelease("C1", "8n");
        setTimeout(() => this.fxSynth.triggerAttackRelease("C1", "8n"), 200);
    }

    playClick() {
        if (!this.initialized || this.muted) return;
        this.pingSynth.triggerAttackRelease("32n");
    }

    playPing() {
        if (!this.initialized || this.muted) return;
        const synth = new Tone.Synth({
            oscillator: { type: 'sine' },
            envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.1 }
        }).connect(this.reverb);
        synth.triggerAttackRelease("C5", "16n");
    }

    // A rising sequence to build tension
    playTensionBuild() {
        // Simple implementation for Scene 4
        if (!this.initialized || this.muted) return;
        let p = 0;
        const notes = ["C3", "D3", "E3", "G3", "A3", "C4", "D4"];

        if (this.tensionLoop) {
            Tone.Transport.clear(this.tensionLoop);
        }

        this.tensionLoop = Tone.Transport.scheduleRepeat((time) => {
            if (p < notes.length) {
                this.ambientSynth.triggerAttackRelease(notes[p], "8n", time);
                p++;
            }
        }, "4n");
    }

    stopTension() {
        if (this.tensionLoop) {
            Tone.Transport.clear(this.tensionLoop);
        }
    }

    playClimax() {
        if (!this.initialized || this.muted) return;
        this.stopTension();
        this.ambientSynth.releaseAll();
        // Major chord
        this.ambientSynth.triggerAttackRelease(["C3", "E3", "G3", "C4"], "1m");

        // Loud click
        const synth = new Tone.Synth({
            oscillator: { type: 'square' },
            envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.1 }
        }).toDestination();
        synth.volume.value = 5;
        synth.triggerAttackRelease("C2", "16n");
    }

    playResolvedAmbient() {
        if (!this.initialized || this.muted) return;
        this.ambientSynth.releaseAll();
        this.ambientSynth.triggerAttack(["F2", "C3", "A3"]);
    }
}

export const soundManager = new SoundManager();
