// Shared basic point shaders

export const pointVertexShader = `
uniform float uTime;
uniform float uSize;
uniform vec3 uTargetColor;
uniform bool uIsConvergence;
uniform float uProgress;
uniform vec3 uBeamA; // Beam A target pos
uniform vec3 uBeamB; // Beam B target pos

attribute vec3 color;
attribute float randomOffset;
attribute vec3 clusterCenter; 

varying vec3 vColor;
varying float vAlpha;

void main() {
    vec3 currentPos = position;
    
    // Base motion
    float wave = sin(uTime * 0.5 + randomOffset) * 0.2;
    currentPos.y += wave;
    currentPos.x += cos(uTime * 0.3 + randomOffset) * 0.1;

    vec4 mvPosition = modelViewMatrix * vec4(currentPos, 1.0);
    gl_PointSize = uSize * (100.0 / -mvPosition.z) * (1.0 + wave*0.5);
    gl_Position = projectionMatrix * mvPosition;

    vColor = color;
    vAlpha = 1.0;
    
    // --- AND GATE LOGIC ---
    // If we're interacting with beams, check distance
    float distA = distance(currentPos, uBeamA);
    float distB = distance(currentPos, uBeamB);
    
    float radius = 5.0; // Beam radius size
    
    bool hitA = distA < radius;
    bool hitB = distB < radius;
    
    if (hitA && !hitB) {
        vColor = mix(vColor, vec3(0.45, 0.70, 1.0), 0.8); // Flash Blue
        vAlpha = 1.5;
        gl_PointSize *= 1.2;
    } else if (hitB && !hitA) {
        vColor = mix(vColor, vec3(0.32, 0.83, 0.54), 0.8); // Flash Green
        vAlpha = 1.5;
        gl_PointSize *= 1.2;
    } else if (hitA && hitB) {
        vColor = vec3(1.0, 1.0, 1.0); // PURE WHITE FLASH (AND-Gate)
        vAlpha = 2.0;
        gl_PointSize *= 2.0;
    }

    // --- CONVERGENCE ---
    if (uIsConvergence) {
         // Everyone morphs slightly
         vColor = mix(vColor, uTargetColor, uProgress);
         
         // Highlight Ectopic
         if (distance(clusterCenter, vec3(-15.0, 5.0, 0.0)) < 1.0) {
             vColor = mix(vColor, vec3(1.0, 0.3, 0.4), uProgress); // Hot magenta
             gl_PointSize *= 1.5;
             vAlpha = 2.0;
         } else {
             // Dim others
             vAlpha = mix(1.0, 0.1, uProgress);
         }
    }
}
`;

export const pointFragmentShader = `
varying vec3 vColor;
varying float vAlpha;

void main() {
    float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
    if (distanceToCenter > 0.5) {
        discard;
    }
    float alpha = vAlpha * (1.0 - (distanceToCenter * 2.0));
    gl_FragColor = vec4(vColor, alpha);
}
`;
