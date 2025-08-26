from fastapi import APIRouter
from pydantic import BaseModel
from app.chains.wiki_qa_chain import wiki_qa_chain

router = APIRouter()

class QueryRequest(BaseModel):
    query: str

@router.post("/recall_wiki")
async def recall_wiki(query: QueryRequest):
    try:
        result = wiki_qa_chain.invoke({"query": query.query})

        # ✅ 기본 응답
        response = {
            "response": result["result"]
        }

        # ✅ 선택적으로 출처 정보도 포함
        if "source_documents" in result:
            sources = []
            for doc in result["source_documents"]:
                path = doc.metadata.get("source", "unknown")
                sources.append(path)
            response["sources"] = sources

        return response

    except Exception as e:
        return {"error": str(e)}
