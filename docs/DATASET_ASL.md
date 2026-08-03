# Open-Source American Sign Language (ASL) Datasets & Resources for AI Agents

This document consolidates state-of-the-art (SOTA), open-source datasets, pose extraction tools, software libraries, and data repositories for training American Sign Language (ASL) machine learning models (Isolated Sign Language Recognition, Continuous Sign Language Recognition, Sign Language Translation, and 3D Pose Generation).

---

## 1. Top SOTA & Large-Scale ASL Datasets

### 1.1 YouTube-ASL (Google Research)
* **Description**: A large-scale, open-domain corpus of ASL videos mined from YouTube, aligned with English captions.
* **Scale**: ~1,000 hours of video across ~2,500 unique signers.
* **Modality**: RGB Video (URLs), English captions, alignment metadata.
* **Primary Use Case**: Large-scale gloss-free ASL-to-English translation and foundational multimodal sign language models.
* **Access**: [google-research/youtube_asl (GitHub)](https://github.com/google-research/youtube_asl)

### 1.2 SignAvatars (ECCV 2024)
* **Description**: A large-scale 3D sign language holistic motion dataset with full-body and high-precision hand meshes.
* **Scale**: 8.34 million frames with 3D SMPL-X body annotations and MANO hand annotations.
* **Modality**: 3D SMPL-X / MANO mesh vectors.
* **Primary Use Case**: 3D Sign Language Production (SLP), avatar motion synthesis, and high-fidelity pose generation.
* **Access**: [SignAvatars Repository](https://github.com/SignAvatars)

### 1.3 ASL Citizen (Microsoft Research / UW / UMD)
* **Description**: A large-scale, crowdsourced dataset for Isolated Sign Language Recognition recorded by Deaf community signers in non-controlled everyday environments.
* **Scale**: ~84,000 clips covering 2,700+ distinct ASL signs.
* **Modality**: RGB Video (MP4) + detailed lexical metadata.
* **Primary Use Case**: Real-world robust Isolated Sign Language Recognition (ISLR) and dictionary lookup.
* **Access**: [Microsoft ASL Citizen (GitHub)](https://github.com/microsoft/ASLCitizen) | [Hugging Face Datasets](https://huggingface.co/datasets)

### 1.4 Google ASL Competitions (Kaggle)
* **Description**: High-efficiency 3D skeletal landmark datasets collected for Kaggle's ASL Isolated Sign and Fingerspelling competitions.
* **Scale**: 100,000+ isolated sign samples and 67,000+ fingerspelling sequences across 59+ signers.
* **Modality**: `.parquet` files containing 543 MediaPipe Holistic landmarks (x, y, z coordinates for face, left hand, right hand, and pose) per frame.
* **Primary Use Case**: Fast, lightweight Graph Neural Network (GNN), Transformer, and LSTM training without heavy video frame decoding.
* **Access**: [Kaggle ASL Signs Dataset](https://www.kaggle.com/competitions/asl-signs/data) | [Kaggle ASL Fingerspelling Dataset](https://www.kaggle.com/competitions/asl-fingerspelling/data)

---

## 2. Isolated Sign Language Recognition (ISLR) Datasets

| Dataset | Size & Vocabulary | Modality / Format | Key Strengths & Use Case | Access Link |
| :--- | :--- | :--- | :--- | :--- |
| **ASL Citizen** | 84,000 clips / 2,700 signs | RGB Video (MP4) | Community-sourced, non-studio, diverse signers | [GitHub](https://github.com/microsoft/ASLCitizen) |
| **WLASL** | 21,000 clips / 2,000 signs | Video (MP4) + JSON Poses | Benchmark for word-level ASL, includes I3D/GCN baseline code | [GitHub](https://github.com/dxli94/WLASL) |
| **MS-ASL** | 25,000 clips / 1,000 signs | Video URLs + Bounding Boxes | Multi-signer dataset from YouTube with standard train/val/test splits | [Microsoft Research](https://www.microsoft.com/en-us/research/project/ms-asl/) |
| **Google ISLR** | 100,000+ clips / 250 signs | MediaPipe Landmarks (Parquet) | Ultra-lightweight pre-extracted 3D pose landmarks for mobile/edge ML | [Kaggle](https://www.kaggle.com/competitions/asl-signs/data) |

---

## 3. Continuous Sign Language Recognition (CSLR) & Translation (SLT)

### 3.1 How2Sign
* **Scope**: 80+ hours of continuous, multi-view ASL.
* **Modalities**: Frontal and side RGB video, depth data, 2D/3D skeleton keypoints, gloss annotations, and English transcripts.
* **Best For**: Sentence-level continuous sign recognition, sign language translation, and multi-view pose estimation.
* **Access**: [How2Sign Website](https://how2sign.github.io/) | [Hugging Face Datasets](https://huggingface.co/datasets)

### 3.2 OpenASL
* **Scope**: 288 hours of ASL video across 200+ signers.
* **Modalities**: Open-domain ASL videos with aligned English translation text.
* **Best For**: Gloss-free end-to-end video-to-text machine translation models.
* **Access**: [OpenASL (GitHub)](https://github.com/chevalierNoir/OpenASL)

### 3.3 RWTH-PHOENIX-Weather 2014T
* **Scope**: Continuous German Sign Language (DGS) weather forecasts.
* **Modalities**: Video clips, manual gloss annotations, and German text transcripts.
* **Best For**: Standard academic baseline benchmark for continuous sign-to-gloss and sign-to-text algorithms.
* **Access**: [RWTH Aachen](https://www-i6.informatik.rwth-aachen.de/~koller/PX-2014-T/) | [Hugging Face](https://huggingface.co/datasets/rwth_phoenix_weather_2014_t)

---

## 4. Fingerspelling Datasets

### 4.1 Google ASL Fingerspelling Recognition
* **Size**: 67,000+ fingerspelling sequences from 59 signers.
* **Format**: MediaPipe Holistic coordinates in Parquet files.
* **Best For**: CTC-loss, Sequence-to-Sequence (Seq2Seq), and Transformer recognition models.
* **Access**: [Kaggle ASL Fingerspelling](https://www.kaggle.com/competitions/asl-fingerspelling/data)

### 4.2 ChicagoFSWild & ChicagoFSWild+
* **Size**: 7,000+ fingerspelling sequences.
* **Format**: Bounding boxes, video clips, character-level annotations.
* **Best For**: Robust fingerspelling detection and recognition in unconstrained real-world video.
* **Access**: [ChicagoFSWild Dataset Page](https://home.ttic.edu/~klivescu/ChicagoFSWild.html)

---

## 5. Phonological & Lexical Databases

* **ASL-LEX / ASL-LEX 2.0**: A lexical database containing detailed phonological properties (handshape, location, movement, orientation, sign frequency) for 2,700+ ASL signs.
  * *Access*: [ASL-LEX Website](https://asl-lex.org/)
* **SignBank**: Public sign language corpora and lexical data mapped to SignWriting and gloss standards.
  * *Access*: [SignBank Portal](https://aslfont.github.io/Symbol-Key/signbank.html)

---

## 6. Open-Source Software Ecosystem & Tools

### 6.1 `pose-format` Python Library
Standardized binary `.pose` format designed by the `sign-language-processing` organization to store, load, augment, and slice multi-person hand/face/body pose sequences efficiently.
* **Install**: `pip install pose-format`
* **Repository**: [sign-language-processing/pose (GitHub)](https://github.com/sign-language-processing/pose)

### 6.2 Standardized Loaders (`sign-language-processing/datasets`)
TensorFlow Datasets (TFDS) and PyTorch dataloaders for 25+ sign language datasets with standardized MediaPipe pose feature formats.
* **Repository**: [sign-language-processing/datasets (GitHub)](https://github.com/sign-language-processing/datasets)

### 6.3 Video-to-Pose & Transcription Utilities
* **Transcription & Segmentation**: Tools for converting raw video files into `.pose` format using MediaPipe/OpenPose ([GitHub](https://github.com/sign-language-processing/transcription)).
* **Pose Evaluation**: Dedicated metrics library (e.g., Dynamic Time Warping for pose arrays) ([GitHub](https://github.com/sign-language-processing/pose-evaluation)).
* **Pose-to-Video / Avatar Rendering**: Pipelines for converting pose sequences back into photorealistic videos or synthetic SignWriting animations ([GitHub](https://github.com/sign-language-processing)).

---

## 7. Dataset Catalogs & Community Repositories

* **[SignLanguage-Dataset-Hub (GitHub)](https://github.com/rudra496/SignLanguage-Dataset-Hub)**: A community-verified directory tracking 67+ sign language datasets across 22 sign languages with benchmark evaluation metrics.
* **[Hugging Face Sign Language Datasets](https://huggingface.co/datasets?search=sign-language)**: Searchable hub containing pre-processed datasets, tokenizers, and checkpoints (`SignBERT`, `HAMLET`, `SPOT-Align`).

---

## 8. Agent Exploration Code Snippets

### Loading Datasets via Hugging Face `datasets`
```python
from datasets import load_dataset

# Load WLASL word-level dataset
wlasl_dataset = load_dataset("wlasl")

# Load RWTH Phoenix continuous translation dataset
phoenix_dataset = load_dataset("rwth_phoenix_weather_2014_t")

print(wlasl_dataset)
```

### Loading `.pose` Files using `pose-format`
```python
from pose_format import Pose

# Read binary pose file
with open("example_sign.pose", "rb") as f:
    pose = Pose.read(f.read())

# Inspect header and keypoint coordinates (frames, people, points, dimensions)
print("Pose data shape:", pose.body.data.shape)

# Normalize keypoints around shoulder width
pose.normalize_distribution()

# Convert keypoints to PyTorch tensor
torch_tensor = pose.body.to_torch()
```

### Loading Google ASL Landmark Data (Parquet)
```python
import pandas as pd

# Read Kaggle MediaPipe landmark parquet file
df = pd.read_parquet("100015657.parquet")

# Filter right hand keypoints for frame 0
right_hand_f0 = df[(df['frame'] == 0) & (df['type'] == 'right_hand')]
print(right_hand_f0[['x', 'y', 'z']])
```
