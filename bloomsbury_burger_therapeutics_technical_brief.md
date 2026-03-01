# Bloomsbury Burger Therapeutics: In Silico Target Discovery for Dual-Targeting CAR-T Cell Therapy in Endometriosis

**Classification:** Internal Technical Document — iGEM Startups 2026  
**Team:** Bloomsbury Burger Therapeutics PLC (pre-seed, pre-revenue, pre-sanity)  
**Status:** Active Development  
**Audience:** Computational biologists, synthetic biologists, bioengineers with working knowledge of single-cell transcriptomics, differentiable programming, and cellular immunotherapy

---

## 1. Clinical Rationale and Biological Problem Statement

### 1.1 The Endometriosis Intervention Gap

Endometriosis affects approximately 190 million individuals globally, representing roughly 10% of reproductive-age women, yet remains one of the most chronically underfunded and diagnostically delayed conditions in biomedicine — a direct downstream consequence of the 1977 FDA mandate excluding women from early-phase clinical trials, a restriction that structurally impoverished the mechanistic understanding of gynaecological disease for decades.

The dominant first-line interventions — hormonal suppression via GnRH agonists and progestins — target disease symptomatically and systemic hormone-axis disruption is rarely tolerable indefinitely. When progestin resistance emerges (itself a poorly characterised epigenetic and transcriptomic phenomenon), the fallback is surgical laparoscopic excision. This is where the clinical problem becomes particularly acute: the gold standard for definitive treatment requires a surgeon to visually distinguish ectopic endometrial lesion tissue from surrounding healthy peritoneal, ovarian, or deep infiltrating tissue *intraoperatively*, in real time, without any molecular guidance. Recurrence rates post-excision are 20-40% at 5 years, in part because residual microscopically non-visible lesion foci are architecturally indistinguishable to the operating surgeon.

This is not a surgical failure per se — it is a target identification failure. The tissue lacks a molecularly addressable, selectively expressed surface marker that would allow either intraoperative fluorescent guidance or, more ambitiously, a systemically administered cell therapy to distinguish ectopic from eutopic or off-target tissue with the requisite selectivity.

### 1.2 Pathophysiology and the Case Against Reverse Menstruation

The retrograde menstruation hypothesis (Sampson, 1927) remains pervasive in clinical practice but is increasingly untenable as a complete mechanistic account. Contemporary single-cell and spatial transcriptomic evidence supports a multifactorial model incorporating niche-dependent epigenomic reprogramming, altered immune surveillance (notably tolerogenic macrophage polarisation and NK cell dysfunction in the peritoneal cavity), and aberrant mesenchymal-epithelial plasticity. The endometrial stromal fibroblast (eStromFib) and the endometrial epithelial cell (eEpC) subpopulations in ectopic lesions exhibit transcriptomic signatures that diverge substantially from their eutopic uterine counterparts — divergence which is precisely the exploitable signal for our computational target discovery pipeline.

### 1.3 CAR-T as a Therapeutic Modality for a Non-Oncological Indication

Chimeric Antigen Receptor T-cell therapy was developed in an oncological context (pioneered by Sadelain, Brentjens, and June; FDA-approved CAR-T products targeting CD19 and BCMA), but the mechanistic logic is directly transferable to non-malignant tissue-ablative indications where:

1. The target cell population is molecularly distinguishable from healthy tissue
2. On-target off-tumour toxicity can be designed against via combinatorial logic gating
3. The disease burden is localised enough that a finite engineered T-cell population can surveil effectively

Endometriosis satisfies all three conditions, contingent on identifying an appropriate surface marker combination. The therapeutic precedent for CAR-T in non-oncological applications now includes cardiac fibrosis (Aghajanian et al., *Nature* 2019 — the direct methodological inspiration for this project) where FAP-targeting CAR-T cells selectively ablated pathological cardiac fibroblasts, substantially improving cardiac function in murine models.

The key translational insight from the Aghajanian work is that **antigen expression specificity, not tissue type, is the determinant of CAR-T applicability**. This reframes the question from "can CAR-T treat endometriosis?" to "can we identify markers expressed specifically and robustly enough in ectopic lesion cells that a CAR-T construct would have a clinically acceptable selectivity window?"

---

## 2. Dataset Architecture and Preprocessing Pipeline

### 2.1 Primary Transcriptomic Dataset: Human Endometrium Atlas

**Primary reference:** Tan et al., *Nature Genetics* (2024), doi: 10.1038/s41588-024-01873-w  
**GEO Accession:** GSE213216

This dataset constitutes the most comprehensive single-cell RNA sequencing atlas of the human endometrium to date, encompassing matched ectopic lesion tissue, eutopic endometrium from affected individuals, and healthy donor endometrium. The atlas provides:

- Cell-type-resolved transcriptomic profiles across lesion subtypes (peritoneal, ovarian, deep infiltrating)
- Paired ectopic/eutopic/healthy triplicates enabling within-donor differential analysis
- Annotated cell type labels spanning epithelial, stromal, immune, endothelial, and smooth muscle compartments

The critical analytical feature for our purposes is the **matched ectopic vs. eutopic** pairing, which allows separation of lesion-specific expression signatures from individual-level transcriptomic variation — a confounder that would otherwise dramatically reduce specificity of identified markers.

**Data format:** AnnData (`.h5ad`), standard 10x Chromium output post Cell Ranger alignment.

### 2.2 Cross-Reference Dataset: Tabula Sapiens

**Reference:** Tabula Sapiens Consortium, *Science* 2022  
**Function:** Pan-tissue healthy human cell atlas used to identify off-target expression of candidate markers

Tabula Sapiens provides single-cell resolution transcriptomic profiles across 24 human tissues from living donors, enabling identification of any candidate surface marker that is expressed in critical healthy tissues. For safety-critical CAR-T design, expression in the following tissue compartments is treated as an **absolute contraindication** and receives an infinite penalty in the optimisation objective:

- Cardiomyocytes (heart)
- Type I and Type II alveolar cells (lung)
- Hepatocytes and cholangiocytes (liver)
- Proximal and distal tubular cells (kidney)
- Neurons (CNS)
- Intestinal enterocytes and goblet cells (gut)

Expression in haematopoietic or lymphoid compartments requires additional consideration given that CAR-T cells are themselves haematopoietic and self-administration of a marker expressed on T or B cells would trigger fratricide.

### 2.3 Quality Control: Single-Cell Best Practices

Prior to any downstream analysis, the raw AnnData object undergoes standard QC filtering per the Heumos et al. best practices framework (single-cell best practices; Theis lab). Key QC metrics and thresholds:

- **Minimum genes per cell:** > 200 (removes empty droplets and debris)
- **Maximum genes per cell:** < 6,000 (removes doublets)
- **Mitochondrial gene fraction:** < 20% (removes dying/stressed cells with compromised membranes)
- **Minimum cells per gene:** > 3 (removes genes detected in too few cells to be statistically reliable)

Doublet detection is performed algorithmically (Scrublet or scDblFinder), and ambient RNA contamination is estimated and corrected via SoupX or CellBender prior to downstream normalisation.

### 2.4 Denoising with scVI-VAE

Raw count data in scRNA-seq is zero-inflated, overdispersed, and contains substantial technical dropout — genes failing to be captured despite being biologically expressed, an artefact of sub-Poisson capture efficiency. Simple log1p normalisation followed by hard binarisation on raw counts would produce a noisy, high-false-negative-rate binarised matrix.

The solution adopted here is **scVI** (Lopez et al., *Nature Methods* 2018) — a variational autoencoder (VAE) generative model designed specifically for single-cell count data. scVI learns a low-dimensional latent representation `z` of each cell and models the observed count data `x` as drawn from a ZINB (zero-inflated negative binomial) generative distribution conditioned on `z`:

```
p(x | z) ~ ZINB(μ(z), θ(z), π(z))
```

Where `μ` is the mean expression, `θ` is the dispersion, and `π` is the zero-inflation probability. The ELBO (evidence lower bound) objective is:

```
L_ELBO = E_{q(z|x)}[log p(x|z)] - KL(q(z|x) || p(z))
```

Crucially, scVI decouples **biological** from **technical** zeros. After training, the model's **posterior mean expression** `E[μ(z)]` is the denoised expression estimate — this is what is used for binarisation, not the raw count. This means technical dropout events (biologically expressed genes counted as zero due to capture failure) are partially recovered through the model's learned latent manifold.

**Binarisation then operates on posterior expression estimates**, not raw counts. A threshold `ε` is applied:

```
X_ij_binary = 1  if E[μ(z_i)]_j > ε
             0  otherwise
```

This is fundamentally more principled than binarising log1p-normalised counts because it conditions on a generative model of biological expression rather than a linear transformation of count data.

---

## 3. The Combinatorial Target Discovery Problem

### 3.1 Problem Formulation

Given the binarised gene expression matrix from the endometrium atlas, filtered to the ~3,000 validated human cell-surface proteins catalogued by the Cell Surface Protein Atlas (Bausch-Fluck et al., 2018), the objective is to identify the pair of surface markers `(a, b)` such that their co-expression:

1. **Maximises** activation probability in ectopic endometrial lesion cells
2. **Minimises** activation probability in healthy eutopic endometrial stromal cells
3. **Minimises** activation probability across all critical tissues in Tabula Sapiens (with hard constraints on vital organs)

### 3.2 Combinatorial Complexity and Why Brute Force is Suboptimal

The validated human cell-surface proteome contains approximately N ≈ 3,000 proteins (Bausch-Fluck et al., 2018). The number of unique unordered pairs from this set is:

```
C(3000, 2) = 3000! / (2! × 2998!) = (3000 × 2999) / 2 = 4,498,500 ≈ 4.5 × 10^6
```

On a GPU-accelerated workstation with NumPy/CuPy, evaluating 4.5M pairs against the endometrium atlas is computationally tractable in reasonable time. However, this naïve approach has a critical structural problem: it evaluates each pair *independently* against the target objective, treating the cross-referencing against Tabula Sapiens as a post-hoc filter. This is epistemically backwards — the safety objective should be integrated into the selection criterion, not applied as a veto after identification.

Furthermore, brute force provides no gradient signal. You cannot *steer* the search. You can only enumerate and rank. This is particularly problematic when you want to enforce multi-objective constraints (simultaneously optimising specificity and safety across many tissues) because the Pareto frontier is not enumerable without evaluating all pairs.

The solution is a **differentiable optimisation framework** that reformulates pair selection as a continuous relaxation of a discrete combinatorial problem, enabling gradient-based optimisation of the joint objective.

---

## 4. The Differentiable Target Discovery Engine: Full Mathematical Specification

### 4.1 Core Insight: Relaxation of Discrete Selection

The fundamental mathematical trick is the **Gumbel-Softmax reparameterisation** (also known as the concrete distribution; Maddison et al. 2017, Jang et al. 2017), which provides a continuous, differentiable approximation to discrete sampling from a categorical distribution. This allows the gradient of an expectation over a discrete latent variable to be estimated via the standard chain rule — something impossible with hard discrete sampling since the function is piecewise constant with zero gradient almost everywhere.

This is the same class of trick used in the variational inference literature under the name **reparameterisation trick** (Kingma & Welling, 2014), but applied here not to a Gaussian latent space but to a Bernoulli/categorical selection problem.

### 4.2 Step 1 — Input Representation

The input to the engine is the binarised gene expression matrix derived from the scVI-denoised posterior:

$$X \in \{0, 1\}^{N \times G}$$

Where:
- $N$ = number of cells
- $G$ = number of candidate surface protein-coding genes (≈ 3,000)
- $X_{ij} = 1$ if gene $j$ is expressed in cell $i$ (posterior estimate above threshold)
- $X_{ij} = 0$ otherwise

Cell-level labels:

$$y_i \in \{0, 1\}$$

Where $y_i = 1$ denotes an ectopic lesion cell and $y_i = 0$ denotes a healthy/eutopic cell.

### 4.3 Step 2 — Learnable Selection Logits

For each candidate gene $j \in \{1, \ldots, G\}$, we introduce a scalar learnable parameter:

$$\alpha_j \in \mathbb{R}$$

These are the **selection logits** — real-valued unconstrained parameters that, once optimised, encode the engine's learned preference for including gene $j$ in the CAR target pair. The entire set $\{\alpha_j\}_{j=1}^{G}$ constitutes the parameter vector $\boldsymbol{\alpha} \in \mathbb{R}^G$ that is updated by gradient descent.

Interpretation: large positive $\alpha_j$ implies the engine has learned that gene $j$ contributes to discriminating lesion from healthy cells under the AND logic; negative $\alpha_j$ implies the gene is contraindicated or uninformative.

### 4.4 Step 3 — Gumbel-Softmax Continuous Relaxation (Soft Mask)

During training, we need $m_j$ — a per-gene soft selection mask — to be differentiable with respect to $\alpha_j$. Hard binarisation via a Heaviside step function is non-differentiable (zero gradient everywhere except at the discontinuity). The Gumbel-Softmax trick resolves this by injecting Gumbel noise and passing through a sigmoid:

$$m_j = \sigma\!\left(\frac{\alpha_j + g_j}{\tau}\right)$$

Where:
- $\sigma(\cdot)$ is the logistic sigmoid function: $\sigma(z) = \frac{1}{1 + e^{-z}}$
- $g_j \sim \text{Gumbel}(0, 1) = -\log(-\log(U_j))$ with $U_j \sim \text{Uniform}(0,1)$ — Gumbel noise providing stochasticity analogous to the reparameterisation in VAEs
- $\tau > 0$ is the **temperature parameter** controlling the sharpness of the relaxation

This yields:

$$m_j \in (0, 1)$$

**Temperature schedule behaviour:**
- At high $\tau$ (e.g., $\tau \to \infty$): $m_j \approx 0.5$ for all $j$ — uniform, smooth, uniform gradient signal but poor discrimination
- At low $\tau$ (e.g., $\tau \to 0^+$): $m_j \to \text{Bernoulli}$ — nearly binary, strong discrimination but vanishing gradients

In practice, $\tau$ is annealed during training from high to low values (temperature annealing schedule), starting with diffuse gradients to explore the space and progressively sharpening toward binary decisions as the optimisation converges.

### 4.5 Step 4 — Differentiable Logical AND Over All Genes

The dual-targeting CAR requires **both** selected markers to be present on a cell for activation. In discrete logic, for markers $a$ and $b$:

$$a_i^{\text{discrete}} = X_{ia} \cdot X_{ib}$$

This is a hard AND gate. We need a differentiable generalisation that extends to a *soft* AND over all $G$ genes weighted by their selection mask $m_j$. The key observation is that the AND of binary inputs can be expressed as a product:

$$a_i = \prod_{j} (1 - m_j(1 - X_{ij}))$$

**Mechanistic interpretation of each factor:**

For a given gene $j$ and cell $i$:
- If the gene is **selected** ($m_j \approx 1$) and **expressed** ($X_{ij} = 1$): factor = $1 - m_j(1-1) = 1 - 0 = 1$ → contributes multiplicatively as 1 (no penalty)
- If the gene is **selected** ($m_j \approx 1$) and **absent** ($X_{ij} = 0$): factor = $1 - m_j(1-0) = 1 - m_j \approx 0$ → drives the whole product toward 0
- If the gene is **not selected** ($m_j \approx 0$): factor = $1 - 0 \cdot (1 - X_{ij}) = 1$ → contributes as 1 regardless of expression (the gene is effectively ignored)

This is the differentiable AND: $a_i \approx 1$ iff all selected genes are expressed in cell $i$; $a_i \approx 0$ if any selected gene is absent. Because $m_j$ is soft during training, gradients propagate through the product, enabling backpropagation to update $\alpha_j$.

### 4.6 Step 4 (Refined) — Log-Space Reformulation for Numerical Stability

The product formulation suffers from **multiplicative underflow** — with many genes, the product of many terms each less than 1 will underflow to machine zero, eliminating gradient signal. The standard fix is to compute in log-space via the identity:

$$\log a_i = \sum_{j} \log(1 - m_j(1 - X_{ij}))$$

Which can be exponentiated to recover $a_i$:

$$a_i = \exp\!\left(\sum_{j} \log(1 - m_j(1 - X_{ij}))\right)$$

**Further simplification exploiting binary inputs $X_{ij} \in \{0, 1\}$:**

For $X_{ij} = 1$: the term $1 - m_j(1 - 1) = 1$, so $\log(1) = 0$ — the gene contributes zero to the log-activation sum.

For $X_{ij} = 0$: the term $1 - m_j(1 - 0) = 1 - m_j$, so $\log(1 - m_j)$ — this is negative when $m_j > 0$.

Therefore, the sum collapses to contributions only from selected genes that are **absent** in cell $i$:

$$\log a_i = \sum_{j:\, X_{ij}=0} \log(1 - m_j)$$

This can be expressed more compactly as:

$$\log a_i = \sum_{j} (1 - X_{ij}) \log(1 - m_j)$$

This is **mathematically beautiful and biologically interpretable**: the log-activation is a weighted sum of penalties for missing required markers, where the weight on each missing marker is determined by how strongly selected it is (i.e., how large $m_j$ is). The activation penalty accumulates *only* over genes that the engine has selected (large $m_j$) and are absent from the cell in question.

### 4.7 Step 5 — Loss Function

The activation $a_i$ is already in $[0, 1]$. The objective is to maximise $a_i$ for lesion cells ($y_i = 1$) and minimise $a_i$ for healthy cells ($y_i = 0$).

**MSE formulation:**

$$\mathcal{L}_{\text{activation}} = \frac{1}{N} \sum_{i} \left[ y_i(1 - a_i)^2 + (1 - y_i) a_i^2 \right]$$

This penalises quadratically when the activation deviates from its target: lesion cells should have $a_i \approx 1$, healthy cells should have $a_i \approx 0$.

**Log-space numerically stable formulation (preferred):**

Working directly in log-space using $\log a_i = \sum_j (1 - X_{ij})\log(1 - m_j)$:

For lesion cells, we want $a_i \to 1$, equivalently $\log a_i \to 0$. The loss is:

$$\mathcal{L}_{\text{lesion}} = -\log a_i = -\sum_{j} (1 - X_{ij}) \log(1 - m_j)$$

For healthy cells, we want $a_i \to 0$, equivalently $\log a_i \to -\infty$. We penalise when $\log a_i$ is too high (i.e., too close to 0):

$$\mathcal{L}_{\text{healthy}} = \exp(\log a_i) = a_i$$

Combined into a single asymmetric cross-entropy-like objective:

$$\mathcal{L} = -y_i \log a_i + (1 - y_i) a_i$$

This is stable and interpretable: log-probability loss for lesion samples, direct activation penalty for healthy samples.

**Alternative MSE formulation (equivalent in spirit):**

$$\mathcal{L} = -\mathbb{E}_{\text{lesion}}[\log(a_i + \epsilon)] + \mathbb{E}_{\text{healthy}}[a_i]$$

Where $\epsilon > 0$ is a small numerical stabiliser preventing $\log(0)$.

### 4.8 Step 6 — Enforcing Dual Targeting: Cardinality Constraint

We require exactly $K = 2$ markers to be selected (dual-targeting CAR). Without an explicit cardinality constraint, the optimisation may spread selection mass across many markers. We add an $L_2$ penalty on the sum of the soft mask:

$$\mathcal{L}_{\text{card}} = \lambda \left(\sum_{j} m_j - K\right)^2$$

Where $K = 2$ and $\lambda$ is a regularisation hyperparameter weighting the cardinality constraint against the activation objective.

The total training objective is:

$$\mathcal{L}_{\text{total}} = \mathcal{L}_{\text{activation}} + \mathcal{L}_{\text{card}}$$

Gradient descent (via PyTorch autograd / Adam optimiser) updates the learnable parameters:

$$\boldsymbol{\alpha} \leftarrow \boldsymbol{\alpha} - \eta \nabla_{\boldsymbol{\alpha}} \mathcal{L}_{\text{total}}$$

With the gradients flowing cleanly through the continuous relaxation $m_j = \sigma((\alpha_j + g_j)/\tau)$.

### 4.9 Step 7 — Hard Inference: Recovering the Discrete Solution

At inference time, the Gumbel noise is removed and $\tau \to 0$, collapsing the soft mask to a Bernoulli:

$$m_j^{\text{hard}} = \mathbb{1}[\alpha_j > 0]$$

In practice, the top-$K$ selection is performed by taking the top 2 learned logits:

$$S^* = \underset{|S|=2}{\text{argmax}} \sum_{j \in S} \alpha_j$$

This gives the optimally selected pair $(a, b)$ without brute force enumeration.

### 4.10 What the Engine Is Actually Computing

The engine is solving the following combinatorial optimisation problem in a principled continuous relaxation:

$$\underset{|S|=2}{\text{argmax}} \left[ P(\text{AND active in lesion}) - P(\text{AND active in healthy}) \right]$$

Without enumerating all $\binom{G}{2}$ pairs. This is differentiable Boolean subset optimisation over binary gene expression data. The system is not a classifier, a representation learner, or a sparse autoencoder in the conventional sense — it is a **differentiable combinatorial search engine** that directly optimises the clinically relevant discriminability objective.

### 4.11 Tissue Safety Integration

For safety-critical cross-referencing against Tabula Sapiens, any pair `(a, b)` where either marker is expressed in vital organs receives an **infinite penalty** effectively implemented as a large positive additive constant in $\mathcal{L}_{\text{total}}$ for cells flagged as vital-organ-positive, or equivalently by including Tabula Sapiens vital organ cells in the healthy cell set $y_i = 0$ with amplified loss weighting. This ensures the gradient landscape penalises selection of markers with off-target vital organ expression at training time, not as a post-hoc filter.

---

## 5. Training Infrastructure and Implementation

### 5.1 Software Stack

- **scRNA-seq preprocessing:** Scanpy, scVI-tools (PyTorch backend)
- **Differentiable optimisation engine:** PyTorch (autograd for gradient computation, Adam optimiser)
- **Binarisation:** Applied to scVI posterior mean expression estimates
- **Cross-referencing:** Tabula Sapiens cells integrated into the training set as hard-constraint healthy samples

### 5.2 Overfitting Considerations

The training data must be split into train/test sets prior to optimisation. Since the objective is marker *discovery* (not generalisation of a classifier), the relevant overfitting concern is that the engine identifies markers that are idiosyncratic to the specific cells in the training set rather than robustly expressed across the biological population of ectopic lesion cells. Held-out test set performance on the activation objective provides an estimate of generalisation to unseen lesion cells — if the top pair achieves high activation on the test set, the markers are likely to be genuinely lesion-specific rather than artefacts of the training samples.

### 5.3 Surface Protein Constraint

The input matrix $X$ is pre-filtered to the ~3,000 validated human cell-surface proteins (Bausch-Fluck et al. Cell Surface Protein Atlas, 2018), restricting $G$ to only transmembrane and GPI-anchored proteins accessible to extracellular scFv binding — a necessary constraint since intracellular markers are pharmacologically inaccessible to CAR-T constructs.

---

## 6. Output: Top Candidate Marker Pairs

The engine outputs a ranked list of candidate pairs with associated metrics. Preliminary results (illustrative):

| Rank | Marker A | Marker B | Specificity Score | Safety Score | Combined Score | Lesion Prevalence | Healthy Prevalence | Tabula Clear | scFv Available |
|------|----------|----------|-------------------|--------------|----------------|-------------------|-------------------|--------------|----------------|
| 1    | PTPRC    | EPCAM    | 0.97              | 0.99         | 0.981          | 0.91              | 0.02              | ✓            | ✓              |
| 2    | MUC16    | FOLR1    | 0.94              | 0.97         | 0.951          | 0.87              | 0.04              | ✓            | ✓              |
| 3    | CDH1     | VTCN1    | 0.91              | 0.96         | 0.923          | 0.83              | 0.06              | ✓            | ✗              |
| 4    | TACSTD2  | MSLN     | 0.89              | 0.94         | 0.901          | 0.79              | 0.08              | ✓            | ✓              |

Once targets are confirmed computationally, benchtop feasibility assessment proceeds: scFv availability screening (existing antibody fragments with validated binding affinities), CAR construct modelling (4-1BB vs. CD28 co-stimulatory domain selection based on the target's expected engagement kinetics), and ex vivo T-cell transduction efficiency estimates.

---

## 7. Contextual Methodological Choices and Design Decisions

### 7.1 Why Not synNotch / Logic-Gated Circuits

SynNotch (Morsut et al., *Cell* 2016) offers programmable AND/NOT logic via transcription factor cascades — a cell receiving Signal A activates via a custom Notch receptor, driving expression of a CAR against Signal B, enabling AND gating with spatial context sensitivity. This would provide a theoretically superior safety profile. However:

- SynNotch remains entirely pre-clinical; no IND-enabling studies as of early 2026
- Construct complexity scales cost super-linearly with approved CAR-T already at ~$500,000 per treatment
- AND/NOT logic circuits exhibit non-trivial leakiness in practice; the gate threshold is difficult to tune
- Spatial transcriptomics-informed circuits are even further from translational feasibility in underfunded settings

The design philosophy here is **minimum viable product with maximum translational plausibility**: dual-targeting CAR with a binary AND logic in the extracellular domain (tandem scFv or bicistronic CAR architecture) maximises the near-term path to clinical relevance while meaningfully improving on single-target CAR designs.

### 7.2 Why Not DEG-Based Target Selection

Conventional target discovery for cell therapy would identify Differentially Expressed Genes (DEGs) by comparing ectopic to eutopic tissue using statistical tests (edgeR, DESeq2), ranking by log2 fold change and adjusted p-value, then selecting the top upregulated surface proteins. The problems with this approach in the dual-targeting context are:

1. DEG analysis optimises for each marker *independently* — it gives no information about co-expression structure. Two markers each with high fold change may be largely co-expressed with each other in a subset of cells, providing redundant rather than complementary AND coverage.

2. The DEG framework does not natively incorporate safety constraints from Tabula Sapiens as part of the selection criterion.

3. DEG-based selection cannot directly optimise the combinatorial objective $P(\text{AND active in lesion}) - P(\text{AND active in healthy})$.

The differentiable engine directly optimises the biologically and clinically meaningful objective, not a statistical proxy for it.

### 7.3 scVI-VAE vs. Raw Count Binarisation

As noted in §2.4, binarising raw counts or log1p-normalised counts introduces systematic false negatives due to technical dropout. In a high-dropout-rate protocol (5' 10x Chromium capture efficiency ~10-30%), a gene expressed in 90% of cells biologically may appear in only 20-30% of cells in the raw count matrix. Binarising this would massively underestimate lesion prevalence. The scVI posterior mean partially recovers this, making the binarised input matrix more representative of the true biological expression state. This is particularly important for our AND logic — false negatives in the input matrix would cause the AND gate to activate far less frequently than it should, corrupting the training signal.

---

## 8. Broader Scientific and Translational Context

### 8.1 The iGEM Startups Framework

This project was conceived and is being developed for the iGEM Startups Biohackathon 2026, a synthetic biology and genetic engineering competition emphasising translational plausibility and clinical relevance. The methodology described here represents a *dry lab* computational target discovery and validation pipeline — the output of which (ranked marker pairs with tissue risk profiles) feeds directly into a *wet lab* scFv and CAR construct feasibility assessment.

### 8.2 Field-Level Context: Deep Tech Femtech

The dominant femtech product landscape in 2026 remains cycle-tracking applications and rebranded thermometry devices — a market failure rooted in the systematic exclusion of female subjects from early clinical trials mandated by the 1977 FDA guidance (partially reversed in 1993 but with lasting structural effects on field investment and mechanistic understanding). This project represents an explicit methodological intervention against that trend: applying state-of-the-art single-cell transcriptomics, differentiable programming, and CAR-T synthetic biology to a disease that has been chronically underfunded and underengineered relative to its clinical burden.

### 8.3 Key Inspirational Work

- **Aghajanian et al., Nature 2019** — FAP-targeted CAR-T for cardiac fibrosis; proof of concept that CAR-T can ablate non-malignant pathological tissue with acceptable selectivity
- **Tan et al., Nature Genetics 2024** — Human Endometrium Atlas; the primary transcriptomic resource
- **Bausch-Fluck et al., 2018** — Cell Surface Protein Atlas; the surface proteome constraint set
- **Lopez et al., Nature Methods 2018** — scVI; the denoising prior
- **Maddison et al. / Jang et al., 2017** — Gumbel-Softmax / Concrete Distribution; the differentiable relaxation framework
- **J&J dual-targeting CAR press release, 2026** — clinical validation that bispecific CAR-T is viable and entering trials in haematological malignancy, justifying the translational bet on dual targeting for endometriosis

---

## 9. Glossary of Technical Terms

| Term | Definition |
|------|-----------|
| CAR-T | Chimeric Antigen Receptor T cell — a T lymphocyte engineered to express a synthetic receptor targeting a specific cell-surface antigen |
| scRNA-seq | Single-cell RNA sequencing — measurement of gene expression at single-cell resolution |
| scVI | Single-cell Variational Inference — a VAE-based generative model for scRNA-seq denoising |
| ZINB | Zero-Inflated Negative Binomial — probability distribution used to model overdispersed count data with excess zeros |
| Gumbel-Softmax | A continuous relaxation of discrete sampling that enables gradient computation through categorical latent variables |
| Differentiable Programming | A paradigm in which the computational graph of an algorithm is made differentiable end-to-end, enabling optimisation via backpropagation |
| AnnData | Python data structure for annotated multivariate observation matrices; standard format for scRNA-seq data |
| scFv | Single-chain variable fragment — the antigen-binding domain of an antibody fused into a CAR construct |
| Tabula Sapiens | Pan-tissue human single-cell atlas used for off-target expression assessment |
| AND Gate (CAR) | Dual-targeting CAR design where both specified antigens must be present on the target cell for T-cell activation |
| Dual targeting | CAR architecture requiring simultaneous engagement of two distinct surface antigens |
| Ectopic | Tissue located outside its normal anatomical position; in endometriosis, endometrial-like tissue found outside the uterus |
| Eutopic | Tissue in its normal location; in the endometriosis context, the in-situ endometrial lining |
| ELBO | Evidence Lower BOund — the objective function optimised in variational inference; a lower bound on the log marginal likelihood |
| Temperature annealing | Progressive reduction of the Gumbel-Softmax temperature $\tau$ during training to sharpen the soft mask toward binary decisions |

---

*Document compiled from team discussion logs and mathematical derivations — Bloomsbury Burger Therapeutics PLC, February 2026. Internal use only.*
