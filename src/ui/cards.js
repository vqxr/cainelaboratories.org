/**
 * cards.js — Builds the top gene pair cards in the Platform section.
 */
export function buildCardsUI(data) {
    if (!data) return;

    const containerIds = ['dynamic-cards-container', 'dynamic-cards-container-2'];

    containerIds.forEach(id => {
        const container = document.getElementById(id);
        if (!container) return;

        container.innerHTML = '';

        data.slice(0, 3).forEach((pair, index) => {
            const rank = index + 1;
            const card = document.createElement('div');
            card.className = 'pair-card';

            // Map data from top_pairs.json (markerA, markerB, combined_score, specificity_score)
            const geneA = pair.markerA || pair.gene_a || pair.geneA || 'N/A';
            const geneB = pair.markerB || pair.gene_b || pair.geneB || 'N/A';
            const score = pair.combined_score || pair.score;
            const specificity = pair.specificity_score || pair.specificity;

            card.innerHTML = `
                <div class="pair-rank">RANK #${String(rank).padStart(2, '0')}</div>
                <div class="pair-genes">
                    <span class="gene">${geneA}</span>
                    <span class="and">AND</span>
                    <span class="gene">${geneB}</span>
                </div>
                <div class="pair-stats">
                    ${score ? `Score: ${score.toFixed(4)}` : ''}
                    ${specificity ? ` · Specificity: ${specificity.toFixed(3)}` : ''}
                </div>
            `;
            container.appendChild(card);
        });
    });
}
