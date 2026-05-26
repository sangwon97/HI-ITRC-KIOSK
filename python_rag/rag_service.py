from __future__ import annotations

import json
import logging
import math
import os
import re
import time
from pathlib import Path
from typing import Any

import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

try:
    from sentence_transformers import SentenceTransformer
except Exception:
    SentenceTransformer = None


ROOT_DIR = Path(__file__).resolve().parents[1]
BOOTHS_JS_PATH = ROOT_DIR / "src" / "data" / "booths.js"
BOOTH_POSITIONS_JS_PATH = ROOT_DIR / "src" / "data" / "boothPositions.js"
INTERACTION_LOG_PATH = ROOT_DIR / "python_rag" / "rag_interactions.json"

DEFAULT_MODEL_NAME = os.getenv("RAG_EMBEDDING_MODEL", "jhgan/ko-sroberta-multitask")
HASH_VECTOR_DIM = 384
RAG_LOG_LEVEL = os.getenv("RAG_LOG_LEVEL", "INFO").upper()
RAG_PRINT_DEBUG = os.getenv("RAG_PRINT_DEBUG", "1").lower() in {"1", "true", "yes", "on"}

logging.basicConfig(level=getattr(logging, RAG_LOG_LEVEL, logging.INFO))
logger = logging.getLogger("hi-itrc-rag")
logger.setLevel(getattr(logging, RAG_LOG_LEVEL, logging.INFO))

SCORE_WEIGHTS = {
    "semantic": 0.62,
    "keyword": 0.20,
    "category": 0.12,
    "popularity": 0.04,
    "distance": 0.02,
}

CATEGORY_LABELS = {
    "ai_bigdata": "AI 빅데이터",
    "ai_platform": "인공지능 플랫폼 서비스",
    "ai_semiconductor": "AI 반도체 디스플레이",
    "next_gen_comm": "차세대 통신 위성",
    "bio_healthcare": "첨단 바이오 헬스케어",
    "cloud_security": "클라우드 보안 블록체인",
    "immersive_sw": "실감 SW 콘텐츠",
    "quantum": "양자 기술 데이터센서",
    "ict_industry": "ICT 산업 융합",
    "robotics_mobility": "첨단 로봇 모빌리티",
    "special_exhibition": "특별 전시관",
}

CATEGORY_KEYWORDS = {
    "ai_bigdata": ["ai", "인공지능", "빅데이터", "데이터", "machine learning", "llm", "vision", "추천"],
    "ai_platform": ["ai", "인공지능", "플랫폼", "서비스", "지능화", "ict", "스마트"],
    "ai_semiconductor": ["ai", "반도체", "온디바이스", "프로세싱", "시스템반도체", "회로", "디스플레이"],
    "next_gen_comm": ["통신", "6g", "5g", "네트워크", "위성", "무선", "차세대"],
    "bio_healthcare": ["바이오", "헬스케어", "의료", "건강", "진단", "웨어러블"],
    "cloud_security": ["클라우드", "보안", "블록체인", "데이터보호", "프라이버시", "제로트러스트"],
    "immersive_sw": ["xr", "vr", "ar", "메타버스", "콘텐츠", "실감", "hci"],
    "quantum": ["양자", "데이터센서", "센서", "인터넷", "컴퓨팅"],
    "ict_industry": ["ict", "산업", "제조", "스마트팜", "에너지", "융합"],
    "robotics_mobility": ["로봇", "모빌리티", "uam", "자율", "무인", "이동체", "드론"],
    "special_exhibition": ["특별", "국방", "ai보안", "군집", "전시"],
}

QUERY_EXPANSIONS = {
    "ai": ["인공지능", "artificial intelligence", "machine learning", "llm", "vision", "robotics"],
    "인공지능": ["ai", "machine learning", "llm", "vision", "온디바이스"],
    "반도체": ["ai 반도체", "시스템반도체", "온디바이스", "프로세싱", "디스플레이", "뉴로모픽"],
    "보안": ["security", "프라이버시", "제로트러스트", "블록체인", "ai보안"],
    "드론": ["무인 이동체", "자율 이동체", "uam", "모빌리티", "로봇"],
    "로봇": ["robotics", "모빌리티", "자율주행", "무인 이동체", "uam"],
    "모빌리티": ["robotics", "uam", "자율", "이동체", "통신"],
    "6g": ["차세대 통신", "무선통신", "네트워크", "위성", "초저지연"],
    "양자": ["quantum", "양자센서", "양자인터넷", "양자정보", "양자컴퓨팅"],
    "뉴로모픽": ["ai 반도체", "온디바이스", "시스템반도체", "프로세싱", "인공지능 하드웨어"],
    "의료": ["헬스케어", "바이오", "진단", "의료 ai", "건강관리"],
    "xr": ["vr", "ar", "메타버스", "실감 콘텐츠", "hci"],
}

INTENT_KEYWORDS = {
    "tour_recommendation": ["투어", "코스", "순서", "돌아", "로드맵", "추천해줘", "둘러"],
    "similar_research": ["유사", "비슷", "관련 연구", "같은 연구", "연관"],
    "navigation": ["어디", "위치", "길", "찾아줘", "가고", "안내"],
    "booth_search": ["부스", "연구실", "센터", "전시", "찾아", "추천"],
}


class RagSearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    top_k: int = Field(5, ge=1, le=20)
    min_score: float = Field(0.0, ge=-1.0, le=1.0)
    current_booth_id: str | None = None
    current_position: list[float] | None = Field(default=None, min_length=2, max_length=2)
    print_debug: bool = False


class SimilarRequest(BaseModel):
    booth_id: str = Field(..., min_length=1)
    top_k: int = Field(5, ge=1, le=20)
    print_debug: bool = False


class TourRequest(BaseModel):
    query: str = Field(..., min_length=1)
    top_k: int = Field(5, ge=2, le=12)
    current_booth_id: str | None = None
    current_position: list[float] | None = Field(default=None, min_length=2, max_length=2)
    print_debug: bool = False


class RelatedFromAnswerRequest(BaseModel):
    question: str = Field(..., min_length=1)
    answer: str = Field("", max_length=8000)
    top_k: int = Field(4, ge=1, le=12)
    print_debug: bool = False


class InteractionRequest(BaseModel):
    booth_id: str = Field(..., min_length=1)
    event_type: str = Field("click", min_length=1, max_length=64)
    query: str | None = None
    source: str | None = None
    metadata: dict[str, Any] | None = None


app = FastAPI(title="HI-ITRC Kiosk RAG Service")

embedding_model: Any | None = None
embedding_backend = "hash-fallback"
booth_documents: list[dict[str, Any]] = []
document_vectors: np.ndarray | None = None
document_index_by_id: dict[str, int] = {}
interaction_stats: dict[str, Any] = {"booths": {}, "events": []}


def normalize_text(value: Any) -> str:
    return str(value or "").strip().lower()


def tokenize(value: str) -> list[str]:
    return re.findall(r"[a-z0-9]+|[가-힣]{2,}", normalize_text(value))


def unique_preserve_order(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        normalized = normalize_text(value)
        if normalized and normalized not in seen:
            seen.add(normalized)
            result.append(normalized)
    return result


def load_interaction_stats() -> dict[str, Any]:
    if not INTERACTION_LOG_PATH.exists():
        return {"booths": {}, "events": []}
    try:
        data = json.loads(INTERACTION_LOG_PATH.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            return {
                "booths": data.get("booths") if isinstance(data.get("booths"), dict) else {},
                "events": data.get("events") if isinstance(data.get("events"), list) else [],
            }
    except Exception as error:
        logger.warning("Failed to load interaction stats. reason=%s", error)
    return {"booths": {}, "events": []}


def save_interaction_stats() -> None:
    try:
        INTERACTION_LOG_PATH.write_text(
            json.dumps(interaction_stats, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    except Exception as error:
        logger.warning("Failed to save interaction stats. reason=%s", error)


def record_interaction_event(request: InteractionRequest) -> dict[str, Any]:
    booth_id = request.booth_id
    event_type = normalize_text(request.event_type) or "click"
    weights = {
        "search_result_click": 1.0,
        "related_booth_click": 1.0,
        "detail_view": 0.8,
        "map_focus": 0.7,
        "poster_view": 0.6,
        "center_view": 0.6,
        "click": 0.5,
    }
    weight = weights.get(event_type, 0.4)
    booth_stats = interaction_stats.setdefault("booths", {}).setdefault(
        booth_id,
        {
            "score": 0.0,
            "events": {},
            "lastEventAt": None,
        },
    )
    booth_stats["score"] = float(booth_stats.get("score", 0.0)) + weight
    events = booth_stats.setdefault("events", {})
    events[event_type] = int(events.get(event_type, 0)) + 1
    booth_stats["lastEventAt"] = time.time()

    event_record = {
        "boothId": booth_id,
        "eventType": event_type,
        "query": request.query,
        "source": request.source,
        "metadata": request.metadata or {},
        "weight": weight,
        "createdAt": time.time(),
    }
    events_log = interaction_stats.setdefault("events", [])
    events_log.append(event_record)
    del events_log[:-500]
    save_interaction_stats()
    return booth_stats


def interaction_popularity(booth_id: str) -> float:
    booth_stats = interaction_stats.get("booths", {}).get(booth_id)
    if not booth_stats:
        return 0.0
    score = float(booth_stats.get("score", 0.0))
    return min(1.0, score / 10.0)


def classify_intent(query: str) -> str:
    normalized = normalize_text(query)
    for intent, terms in INTENT_KEYWORDS.items():
        if any(term in normalized for term in terms):
            return intent
    return "booth_search"


def extract_keywords(query: str) -> list[str]:
    tokens = tokenize(query)
    category_terms = [
        keyword
        for keywords in CATEGORY_KEYWORDS.values()
        for keyword in keywords
        if keyword in normalize_text(query)
    ]
    return unique_preserve_order(category_terms + [token for token in tokens if len(token) >= 2])


def expand_query_terms(query: str) -> list[str]:
    terms = extract_keywords(query)
    expanded = [query, *terms]
    normalized_query = normalize_text(query)
    for trigger, additions in QUERY_EXPANSIONS.items():
        if trigger in normalized_query or trigger in terms:
            expanded.extend(additions)
    return unique_preserve_order(expanded)


def infer_query_categories(expanded_terms: list[str]) -> dict[str, float]:
    joined = " ".join(expanded_terms)
    result: dict[str, float] = {}
    for category_id, keywords in CATEGORY_KEYWORDS.items():
        matches = sum(1 for keyword in keywords if keyword in joined)
        if matches:
            result[category_id] = min(1.0, matches / max(2, len(keywords) * 0.35))
    return result


def hash_embedding(text: str, dim: int = HASH_VECTOR_DIM) -> np.ndarray:
    vector = np.zeros(dim, dtype=np.float32)
    for token in tokenize(text):
        index = hash(token) % dim
        vector[index] += 1.0
    norm = np.linalg.norm(vector)
    if norm == 0:
        return vector
    return vector / norm


def encode_texts(texts: list[str]) -> np.ndarray:
    global embedding_model, embedding_backend

    if SentenceTransformer is not None:
        try:
            if embedding_model is None:
                embedding_model = SentenceTransformer(DEFAULT_MODEL_NAME)
                embedding_backend = DEFAULT_MODEL_NAME
            vectors = embedding_model.encode(texts, normalize_embeddings=True)
            return np.asarray(vectors, dtype=np.float32)
        except Exception as error:
            logger.warning("SentenceTransformer unavailable; using hash fallback. reason=%s", error)

    embedding_backend = "hash-fallback"
    return np.vstack([hash_embedding(text) for text in texts]).astype(np.float32)


def parse_js_objects_array(file_text: str, export_name: str) -> list[dict[str, str]]:
    pattern = re.compile(rf"export\s+const\s+{re.escape(export_name)}\s*=\s*\[(.*?)\];", re.S)
    match = pattern.search(file_text)
    if not match:
        return []

    body = match.group(1)
    rows: list[dict[str, str]] = []
    for item_match in re.finditer(r"\{(.*?)\}", body, re.S):
        item_text = item_match.group(1)
        row: dict[str, str] = {}
        for key, value in re.findall(r"(\w+)\s*:\s*'([^']*)'", item_text):
            row[key] = value
        if row:
            rows.append(row)
    return rows


def parse_booth_positions(file_text: str) -> dict[str, list[float]]:
    rows: dict[str, list[float]] = {}
    for booth_id, x_value, z_value in re.findall(
        r"([A-Z0-9]+)\s*:\s*\[\s*([-0-9.]+)\s*,\s*([-0-9.]+)\s*\]",
        file_text,
    ):
        rows[booth_id] = [float(x_value), float(z_value)]
    return rows


def category_keywords(category_id: str) -> list[str]:
    return CATEGORY_KEYWORDS.get(category_id, [])


def build_summary(booth: dict[str, str], category_label: str, keywords: list[str]) -> str:
    return (
        f"{booth.get('name', '')}은 {category_label} 분야의 연구 부스입니다. "
        f"주요 키워드는 {', '.join(keywords[:8])}이며 "
        f"{booth.get('univ', '')}에서 운영합니다."
    )


def build_document_text(metadata: dict[str, Any]) -> str:
    fields = [
        metadata["booth_name"],
        metadata["lab"],
        metadata["university"],
        metadata["category"],
        metadata["category_label"],
        metadata["summary"],
        metadata["research"],
        metadata["location"],
        " ".join(metadata["keywords"]),
        " ".join(metadata["research_topics"]),
    ]
    return "\n".join(str(field) for field in fields if field)


def load_booth_documents() -> list[dict[str, Any]]:
    if not BOOTHS_JS_PATH.exists():
        raise RuntimeError(f"Booth data file not found: {BOOTHS_JS_PATH}")

    booths_text = BOOTHS_JS_PATH.read_text(encoding="utf-8")
    positions_text = BOOTH_POSITIONS_JS_PATH.read_text(encoding="utf-8") if BOOTH_POSITIONS_JS_PATH.exists() else ""
    booths = parse_js_objects_array(booths_text, "booths")
    category_rows = parse_js_objects_array(booths_text, "categories")
    category_labels = {
        row["id"]: row.get("label") or CATEGORY_LABELS.get(row["id"], row["id"])
        for row in category_rows
        if row.get("id")
    }
    positions = parse_booth_positions(positions_text)

    documents: list[dict[str, Any]] = []
    for booth in booths:
        booth_id = booth.get("id")
        if not booth_id:
            continue

        category_id = booth.get("category", "")
        category_label = CATEGORY_LABELS.get(category_id) or category_labels.get(category_id, category_id)
        keywords = unique_preserve_order(
            [
                category_label,
                category_id.replace("_", " "),
                *category_keywords(category_id),
                booth.get("name", ""),
                booth.get("univ", ""),
            ]
        )
        summary = build_summary(booth, category_label, keywords)
        metadata = {
            "booth_name": booth.get("name", ""),
            "lab": booth.get("name", ""),
            "lab_name": booth.get("name", ""),
            "keywords": keywords,
            "university": booth.get("univ", ""),
            "category": category_id,
            "category_label": category_label,
            "summary": summary,
            "research": summary,
            "location": f"{booth.get('section', '')} {booth.get('booth', '')}".strip(),
            "research_topics": category_keywords(category_id),
            "position": positions.get(booth_id),
            "popularity": estimate_popularity(booth),
        }
        documents.append(
            {
                "id": booth_id,
                "name": booth.get("name", ""),
                "univ": booth.get("univ", ""),
                "category": category_id,
                "section": booth.get("section", ""),
                "booth": booth.get("booth", ""),
                "metadata": metadata,
                "text": build_document_text(metadata),
            }
        )

    return documents


def estimate_popularity(booth: dict[str, str]) -> float:
    text = normalize_text(f"{booth.get('id', '')} {booth.get('name', '')} {booth.get('univ', '')}")
    score = 0.45
    if "kaist" in text or "postech" in text or "unist" in text or "gist" in text:
        score += 0.2
    if any(term in text for term in ["ai", "6g", "xr", "uam"]):
        score += 0.12
    if "special" in text:
        score += 0.1
    return min(score, 1.0)


def initialize_rag() -> None:
    global booth_documents, document_vectors, document_index_by_id
    booth_documents = load_booth_documents()
    if not booth_documents:
        raise RuntimeError("No booth documents were loaded.")

    document_vectors = encode_texts([document["text"] for document in booth_documents])
    document_index_by_id = {document["id"]: index for index, document in enumerate(booth_documents)}
    print(
        "[RAG] index initialized "
        + json.dumps(
            {
                "documents": len(booth_documents),
                "vectorShape": list(document_vectors.shape),
                "embeddingBackend": embedding_backend,
                "vectorStore": "numpy",
            },
            ensure_ascii=False,
        ),
        flush=True,
    )


def get_current_position(request: RagSearchRequest | TourRequest) -> list[float] | None:
    if request.current_position:
        return [float(request.current_position[0]), float(request.current_position[1])]
    if request.current_booth_id and request.current_booth_id in document_index_by_id:
        document = booth_documents[document_index_by_id[request.current_booth_id]]
        return document["metadata"].get("position")
    return None


def distance_score(position: list[float] | None, current_position: list[float] | None) -> float:
    if not position or not current_position:
        return 0.5
    distance = math.dist(position, current_position)
    return 1.0 / (1.0 + distance / 12.0)


def keyword_score(query_terms: list[str], document: dict[str, Any]) -> float:
    text = normalize_text(document["text"])
    if not query_terms:
        return 0.0
    matches = sum(1 for term in query_terms if normalize_text(term) and normalize_text(term) in text)
    return min(1.0, matches / max(1, min(len(query_terms), 8)))


def matched_keywords(query_terms: list[str], document: dict[str, Any], limit: int = 8) -> list[str]:
    text = normalize_text(document["text"])
    matches = [
        term
        for term in query_terms
        if normalize_text(term) and normalize_text(term) in text and len(normalize_text(term)) >= 2
    ]
    return unique_preserve_order(matches)[:limit]


def category_score(query_categories: dict[str, float], document: dict[str, Any]) -> float:
    return float(query_categories.get(document["category"], 0.0))


def compute_candidate_scores(
    query_vector: np.ndarray,
    expanded_terms: list[str],
    query_categories: dict[str, float],
    current_position: list[float] | None,
    candidate_limit: int,
) -> tuple[list[dict[str, Any]], int]:
    if document_vectors is None:
        raise HTTPException(status_code=503, detail="RAG index is not initialized.")

    semantic_scores = np.matmul(document_vectors, query_vector)
    candidate_limit = min(candidate_limit, len(booth_documents))
    candidate_indices = np.argsort(-semantic_scores)[:candidate_limit]
    candidates: list[dict[str, Any]] = []

    for index in candidate_indices:
        document = booth_documents[int(index)]
        semantic = float(semantic_scores[index])
        keyword = keyword_score(expanded_terms, document)
        category = category_score(query_categories, document)
        base_popularity = float(document["metadata"].get("popularity", 0.0))
        log_popularity = interaction_popularity(document["id"])
        popularity = min(1.0, (0.65 * base_popularity) + (0.35 * log_popularity))
        distance = distance_score(document["metadata"].get("position"), current_position)
        final_score = (
            SCORE_WEIGHTS["semantic"] * semantic
            + SCORE_WEIGHTS["keyword"] * keyword
            + SCORE_WEIGHTS["category"] * category
            + SCORE_WEIGHTS["popularity"] * popularity
            + SCORE_WEIGHTS["distance"] * distance
        )
        candidates.append(
            {
                "document": document,
                "score": final_score,
                "scoreBreakdown": {
                    "semantic": semantic,
                    "keyword": keyword,
                    "category": category,
                    "popularity": popularity,
                    "distance": distance,
                },
                "matchedKeywords": matched_keywords(expanded_terms, document),
            }
        )

    candidates.sort(key=lambda item: item["score"], reverse=True)
    return candidates, len(candidate_indices)


def strip_search_directives(query: str) -> str:
    result = re.sub(r"\s+", " ", query or "").strip()
    directives = ["관련 부스 추천", "부스 추천", "연구센터 찾기", "포스터 상세보기", "기술 설명"]
    labels = list(CATEGORY_LABELS.values())
    for _ in range(6):
        previous = result
        for suffix in directives + labels:
            if suffix and result.endswith(suffix):
                result = result[: -len(suffix)].strip()
        if result == previous:
            break
    return result or query.strip()


def build_refinement_query(query: str, category_label: str) -> str:
    base = strip_search_directives(query)
    return f"{base} {category_label} 관련 부스 추천".strip()


def build_category_clusters(results: list[dict[str, Any]], query: str = "") -> list[dict[str, Any]]:
    clusters: dict[str, dict[str, Any]] = {}
    for item in results:
        document = item["document"]
        category_id = document["category"]
        cluster = clusters.setdefault(
            category_id,
            {
                "category": category_id,
                "categoryLabel": document["metadata"]["category_label"],
                "count": 0,
                "representative": None,
                "refinementQuery": build_refinement_query(query, document["metadata"]["category_label"]) if query else "",
            },
        )
        cluster["count"] += 1
        if cluster["representative"] is None:
            cluster["representative"] = serialize_scored_result(item)
    return sorted(clusters.values(), key=lambda cluster: cluster["count"], reverse=True)


def build_clarification(query: str, results: list[dict[str, Any]], clusters: list[dict[str, Any]]) -> dict[str, Any] | None:
    keywords = extract_keywords(query)
    is_broad = len(keywords) <= 2 or normalize_text(query) in {"ai", "인공지능", "보안", "반도체", "드론"}
    if len(results) >= 5 and len(clusters) >= 3 and is_broad:
        options = [cluster["categoryLabel"] for cluster in clusters[:4]]
        return {
            "required": False,
            "reason": "broad_query_many_matches",
            "message": f"관련 부스가 여러 분야에 걸쳐 있습니다. {' / '.join(options)} 중 관심 분야를 좁히면 더 정확히 추천할 수 있습니다.",
            "options": options,
        }
    return None


def run_retrieval(request: RagSearchRequest) -> dict[str, Any]:
    if not booth_documents or document_vectors is None:
        initialize_rag()

    expanded_terms = expand_query_terms(request.query)
    expanded_query = " ".join(expanded_terms)
    query_vector = encode_texts([expanded_query])[0]
    query_categories = infer_query_categories(expanded_terms)
    current_position = get_current_position(request)
    candidate_limit = max(request.top_k * 4, 12)
    candidates, candidate_count = compute_candidate_scores(
        query_vector,
        expanded_terms,
        query_categories,
        current_position,
        candidate_limit,
    )
    filtered = [item for item in candidates if item["score"] >= request.min_score]
    fallback_applied = False
    if not filtered and candidates:
        filtered = candidates[: request.top_k]
        fallback_applied = True
    top_results = filtered[: request.top_k]
    clusters = build_category_clusters(top_results, request.query)

    return {
        "intent": classify_intent(request.query),
        "extractedKeywords": extract_keywords(request.query),
        "expandedTerms": expanded_terms,
        "expandedQuery": expanded_query,
        "queryVector": query_vector,
        "queryCategories": query_categories,
        "currentPosition": current_position,
        "candidateCount": candidate_count,
        "topResults": top_results,
        "categoryClusters": clusters,
        "clarification": build_clarification(request.query, top_results, clusters),
        "fallbackApplied": fallback_applied,
    }


def serialize_scored_result(item: dict[str, Any], rank: int | None = None) -> dict[str, Any]:
    document = item["document"]
    result = {
        "id": document["id"],
        "name": document["name"],
        "univ": document["univ"],
        "category": document["category"],
        "section": document["section"],
        "booth": document["booth"],
        "score": round(float(item["score"]), 6),
        "scoreBreakdown": {
            key: round(float(value), 6) if isinstance(value, (int, float)) else value
            for key, value in item["scoreBreakdown"].items()
        },
        "matchedKeywords": item.get("matchedKeywords", []),
        "recommendationReason": build_recommendation_reason(document, item),
        "metadata": document["metadata"],
    }
    if rank is not None:
        result["rank"] = rank
    return result


def build_map_payload(results: list[dict[str, Any]]) -> dict[str, Any]:
    serialized = [serialize_scored_result(item, rank=rank) for rank, item in enumerate(results, start=1)]
    return {
        "highlightBoothIds": [item["id"] for item in serialized],
        "focusBoothId": serialized[0]["id"] if serialized else None,
        "routeCandidates": [
            {
                "id": item["id"],
                "name": item["name"],
                "position": item.get("metadata", {}).get("position"),
                "score": item["score"],
            }
            for item in serialized
        ],
    }


def build_related_query(question: str, answer: str, keywords: list[str]) -> str:
    return " ".join([question, *keywords, answer]).replace("\n", " ")[:900].strip()


def build_recommendation_reason(document: dict[str, Any], item: dict[str, Any]) -> str:
    keywords = item.get("matchedKeywords") or document["metadata"].get("keywords", [])[:3]
    keyword_text = ", ".join(keywords[:3])
    category_label = document["metadata"].get("category_label") or document["category"]
    if keyword_text:
        return f"{category_label} 분야에서 {keyword_text} 키워드가 질문과 잘 맞습니다."
    return f"{category_label} 분야와 질문 의미가 가까워 추천되었습니다."


def vector_preview(vector: np.ndarray, limit: int = 12) -> list[float]:
    return [round(float(value), 6) for value in vector[:limit]]


def build_llm_prompt(query: str, results: list[dict[str, Any]]) -> str:
    blocks = []
    for rank, item in enumerate(results, start=1):
        document = item["document"]
        metadata = document["metadata"]
        blocks.append(
            "\n".join(
                [
                    f"[{rank}] {document['name']} ({document['univ']})",
                    f"- booth_id: {document['id']}",
                    f"- category: {metadata['category_label']}",
                    f"- location: {metadata['location']}",
                    f"- score: {item['score']:.4f}",
                    f"- summary: {metadata['summary']}",
                    f"- keywords: {', '.join(metadata['keywords'][:10])}",
                ]
            )
        )
    return "\n\n".join(
        [
            "사용자 질문에 대해 아래 RAG 검색 결과만 근거로 짧고 정확하게 답변하세요.",
            "답변에는 추천 부스명, 대학/기관, 위치, 추천 이유를 포함하세요.",
            f"사용자 질문: {query}",
            "검색 결과:",
            "\n\n".join(blocks) if blocks else "검색된 문서가 없습니다.",
        ]
    )


def build_index_debug_sample(limit: int = 3) -> list[dict[str, Any]]:
    if document_vectors is None:
        return []
    return [
        {
            "id": document["id"],
            "storedDocumentText": document["text"],
            "metadata": document["metadata"],
            "embeddingPreview": vector_preview(document_vectors[index]),
            "embeddingNorm": round(float(np.linalg.norm(document_vectors[index])), 6),
        }
        for index, document in enumerate(booth_documents[:limit])
    ]


def log_retrieval_debug(request: RagSearchRequest | TourRequest, retrieval: dict[str, Any]) -> None:
    top_results = retrieval["topResults"]
    payload = {
        "queryUnderstanding": {
            "query": request.query,
            "intent": retrieval["intent"],
            "extractedKeywords": retrieval["extractedKeywords"],
            "expandedQuery": retrieval["expandedTerms"],
            "queryCategories": retrieval["queryCategories"],
        },
        "embedding": {
            "backend": embedding_backend,
            "vectorStore": "numpy",
            "queryEmbeddingPreview": vector_preview(retrieval["queryVector"]),
            "queryEmbeddingNorm": round(float(np.linalg.norm(retrieval["queryVector"])), 6),
        },
        "retrieval": {
            "candidateCount": retrieval["candidateCount"],
            "fallbackApplied": retrieval["fallbackApplied"],
            "categoryClusters": retrieval["categoryClusters"],
            "clarification": retrieval["clarification"],
            "topResults": [
                {
                    "rank": rank,
                    "id": item["document"]["id"],
                    "name": item["document"]["name"],
                    "univ": item["document"]["univ"],
                    "location": item["document"]["metadata"]["location"],
                    "score": round(float(item["score"]), 6),
                    "scoreBreakdown": {
                        key: round(float(value), 6) if isinstance(value, (int, float)) else value
                        for key, value in item["scoreBreakdown"].items()
                    },
                }
                for rank, item in enumerate(top_results, start=1)
            ],
        },
        "llmPromptBeforeCall": build_llm_prompt(request.query, top_results),
    }
    print("[RAG] retrieval debug\n" + json.dumps(payload, ensure_ascii=False, indent=2), flush=True)


def build_tour_plan(retrieval: dict[str, Any]) -> list[dict[str, Any]]:
    stops = [serialize_scored_result(item, rank=rank) for rank, item in enumerate(retrieval["topResults"], start=1)]
    if not stops:
        return []

    current_position = retrieval.get("currentPosition")
    remaining = stops[:]
    ordered: list[dict[str, Any]] = []
    last_position = current_position

    while remaining:
        if last_position is None:
            next_stop = remaining.pop(0)
            distance = None
        else:
            next_index, next_stop = min(
                enumerate(remaining),
                key=lambda pair: math.dist(
                    pair[1]["metadata"].get("position") or last_position,
                    last_position,
                ),
            )
            position = next_stop["metadata"].get("position")
            distance = math.dist(position, last_position) if position else None
            remaining.pop(next_index)

        next_stop["tourStep"] = len(ordered) + 1
        next_stop["distanceFromPrevious"] = round(distance, 3) if distance is not None else None
        ordered.append(next_stop)
        last_position = next_stop["metadata"].get("position") or last_position

    return ordered


def find_similar_booths(booth_id: str, top_k: int) -> list[dict[str, Any]]:
    if not booth_documents or document_vectors is None:
        initialize_rag()
    if booth_id not in document_index_by_id:
        raise HTTPException(status_code=404, detail=f"Unknown booth_id: {booth_id}")

    source_index = document_index_by_id[booth_id]
    source_vector = document_vectors[source_index]
    scores = np.matmul(document_vectors, source_vector)
    scored: list[dict[str, Any]] = []
    for index in np.argsort(-scores):
        index = int(index)
        if index == source_index:
            continue
        document = booth_documents[index]
        semantic = float(scores[index])
        same_category = 1.0 if document["category"] == booth_documents[source_index]["category"] else 0.0
        final_score = 0.84 * semantic + 0.16 * same_category
        scored.append(
            {
                "document": document,
                "score": final_score,
                "scoreBreakdown": {
                    "semantic": semantic,
                    "sameCategory": same_category,
                },
            }
        )
        if len(scored) >= top_k:
            break
    return [serialize_scored_result(item, rank=rank) for rank, item in enumerate(scored, start=1)]


@app.on_event("startup")
def startup() -> None:
    global interaction_stats
    interaction_stats = load_interaction_stats()
    initialize_rag()


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "embeddingBackend": embedding_backend,
        "vectorStore": "numpy",
        "documentCount": len(booth_documents),
        "vectorShape": list(document_vectors.shape) if document_vectors is not None else None,
        "retrieval": "semantic embedding search + metadata/navigation-aware reranking",
        "weights": SCORE_WEIGHTS,
        "interactionBoothCount": len(interaction_stats.get("booths", {})),
    }


@app.post("/rag/search")
def rag_search(request: RagSearchRequest) -> dict[str, Any]:
    retrieval = run_retrieval(request)
    if request.print_debug or RAG_PRINT_DEBUG:
        log_retrieval_debug(request, retrieval)
    return {
        "query": request.query,
        "queryUnderstanding": {
            "intent": retrieval["intent"],
            "keywords": retrieval["extractedKeywords"],
            "queryCategories": retrieval["queryCategories"],
        },
        "expandedQuery": retrieval["expandedTerms"],
        "topK": request.top_k,
        "embeddingBackend": embedding_backend,
        "vectorStore": "numpy",
        "retrievalMethod": "semantic-search+metadata-aware-reranking",
        "weights": SCORE_WEIGHTS,
        "categoryClusters": retrieval["categoryClusters"],
        "clarification": retrieval["clarification"],
        "fallbackApplied": retrieval["fallbackApplied"],
        "mapPayload": build_map_payload(retrieval["topResults"]),
        "results": [serialize_scored_result(item, rank=rank) for rank, item in enumerate(retrieval["topResults"], start=1)],
    }


@app.post("/rag/related")
def rag_related_from_answer(request: RelatedFromAnswerRequest) -> dict[str, Any]:
    combined_text = f"{request.question} {request.answer}"
    extracted = extract_keywords(combined_text)[:12]
    related_query = build_related_query(request.question, request.answer, extracted)
    search_request = RagSearchRequest(
        query=related_query,
        top_k=request.top_k,
        min_score=0,
        print_debug=request.print_debug,
    )
    retrieval = run_retrieval(search_request)
    payload = {
        "question": request.question,
        "answerPreview": request.answer[:700],
        "relatedQuery": related_query,
        "extractedKeywords": extracted,
        "embeddingBackend": embedding_backend,
        "retrievalMethod": "answer-keyword-expansion+semantic-search+metadata-aware-reranking",
        "weights": SCORE_WEIGHTS,
        "queryUnderstanding": {
            "intent": retrieval["intent"],
            "keywords": retrieval["extractedKeywords"],
            "queryCategories": retrieval["queryCategories"],
        },
        "expandedQuery": retrieval["expandedTerms"],
        "categoryClusters": retrieval["categoryClusters"],
        "fallbackApplied": retrieval["fallbackApplied"],
        "mapPayload": build_map_payload(retrieval["topResults"]),
        "results": [serialize_scored_result(item, rank=rank) for rank, item in enumerate(retrieval["topResults"], start=1)],
    }
    if request.print_debug or RAG_PRINT_DEBUG:
        print("[RAG] related from answer\n" + json.dumps(payload, ensure_ascii=False, indent=2), flush=True)
    return payload


@app.post("/rag/interaction")
def rag_interaction(request: InteractionRequest) -> dict[str, Any]:
    if not booth_documents or document_vectors is None:
        initialize_rag()
    if request.booth_id not in document_index_by_id:
        raise HTTPException(status_code=404, detail=f"Unknown booth_id: {request.booth_id}")
    booth_stats = record_interaction_event(request)
    payload = {
        "ok": True,
        "boothId": request.booth_id,
        "eventType": request.event_type,
        "boothStats": booth_stats,
        "interactionPopularity": interaction_popularity(request.booth_id),
    }
    print("[RAG] interaction\n" + json.dumps(payload, ensure_ascii=False), flush=True)
    return payload


@app.post("/rag/debug")
def rag_debug(request: RagSearchRequest) -> dict[str, Any]:
    retrieval = run_retrieval(request)
    log_retrieval_debug(request, retrieval)
    return {
        "purpose": "RAG 내부 처리 과정을 확인하는 디버그 출력입니다. 이 엔드포인트는 LLM을 호출하지 않습니다.",
        "indexingProcess": {
            "step1_sourceDocuments": {
                "boothDataSource": str(BOOTHS_JS_PATH),
                "positionDataSource": str(BOOTH_POSITIONS_JS_PATH),
                "documentCount": len(booth_documents),
            },
            "step2_metadataFusion": {
                "fields": [
                    "booth_name",
                    "lab",
                    "keywords",
                    "university",
                    "category",
                    "category_label",
                    "summary",
                    "location",
                    "research_topics",
                    "position",
                    "popularity",
                ],
                "sampleStoredDocuments": build_index_debug_sample(limit=3),
            },
            "step3_embeddingAndVectorStore": {
                "embeddingBackend": embedding_backend,
                "vectorStoreType": "in-memory numpy matrix",
                "vectorShape": list(document_vectors.shape) if document_vectors is not None else None,
            },
        },
        "queryProcess": {
            "originalQuery": request.query,
            "intent": retrieval["intent"],
            "extractedKeywords": retrieval["extractedKeywords"],
            "expandedQueryTerms": retrieval["expandedTerms"],
            "expandedQueryText": retrieval["expandedQuery"],
            "queryEmbeddingPreview": vector_preview(retrieval["queryVector"]),
            "queryEmbeddingNorm": round(float(np.linalg.norm(retrieval["queryVector"])), 6),
            "currentPosition": retrieval["currentPosition"],
        },
        "retrievalProcess": {
            "method": "numpy cosine similarity + keyword/category/popularity/distance reranking",
            "candidateCount": retrieval["candidateCount"],
            "finalScoreFormula": "0.62*semantic + 0.20*keyword + 0.12*category + 0.04*popularity + 0.02*distance",
            "weights": SCORE_WEIGHTS,
            "categoryClusters": retrieval["categoryClusters"],
            "clarification": retrieval["clarification"],
            "fallbackApplied": retrieval["fallbackApplied"],
            "topK": request.top_k,
            "rankedResults": [
                serialize_scored_result(item, rank=rank)
                for rank, item in enumerate(retrieval["topResults"], start=1)
            ],
        },
        "llmPromptBeforeCall": {
            "description": "검색 결과를 LLM 설명 생성에 전달하기 직전의 프롬프트 형태입니다.",
            "prompt": build_llm_prompt(request.query, retrieval["topResults"]),
        },
    }


@app.post("/rag/tour")
def rag_tour(request: TourRequest) -> dict[str, Any]:
    search_request = RagSearchRequest(
        query=request.query,
        top_k=request.top_k,
        current_booth_id=request.current_booth_id,
        current_position=request.current_position,
        print_debug=request.print_debug,
    )
    retrieval = run_retrieval(search_request)
    tour_stops = build_tour_plan(retrieval)
    if request.print_debug or RAG_PRINT_DEBUG:
        log_retrieval_debug(search_request, retrieval)
        print("[RAG] tour plan\n" + json.dumps(tour_stops, ensure_ascii=False, indent=2), flush=True)
    return {
        "query": request.query,
        "embeddingBackend": embedding_backend,
        "vectorStore": "numpy",
        "tourStops": tour_stops,
        "highlightBoothIds": [stop["id"] for stop in tour_stops],
    }


@app.post("/rag/similar")
def rag_similar(request: SimilarRequest) -> dict[str, Any]:
    results = find_similar_booths(request.booth_id, request.top_k)
    payload = {
        "sourceBoothId": request.booth_id,
        "embeddingBackend": embedding_backend,
        "vectorStore": "numpy",
        "retrievalMethod": "document-embedding-similarity",
        "results": results,
    }
    if request.print_debug or RAG_PRINT_DEBUG:
        print("[RAG] similar research\n" + json.dumps(payload, ensure_ascii=False, indent=2), flush=True)
    return payload
