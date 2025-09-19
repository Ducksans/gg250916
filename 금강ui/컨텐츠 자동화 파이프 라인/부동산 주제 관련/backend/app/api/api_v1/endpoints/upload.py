import os
import uuid
from typing import List
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app import crud, models
from app.api import deps
from app.core.config import settings
from app.core.exceptions import InvalidFileTypeException, FileSizeExceededException
from app.utils import allowed_file, get_file_size, format_file_size, create_upload_folder

router = APIRouter()


@router.post("/image", response_model=dict)
async def upload_image(
    *,
    db: Session = Depends(deps.get_db),
    file: UploadFile = File(...),
    current_user: models.User = Depends(deps.get_current_user),
):
    """
    이미지 파일 업로드
    """
    # 파일 확장자 검사
    if not allowed_file(file.filename, settings.ALLOWED_IMAGE_EXTENSIONS):
        raise InvalidFileTypeException(
            file_type=file.filename.split('.')[-1] if '.' in file.filename else 'unknown',
            allowed_types=list(settings.ALLOWED_IMAGE_EXTENSIONS)
        )
    
    # 파일 크기 검사
    file_content = await file.read()
    if len(file_content) > settings.MAX_FILE_SIZE:
        raise FileSizeExceededException(
            file_size=len(file_content),
            max_size=settings.MAX_FILE_SIZE
        )
    
    # 업로드 디렉토리 생성
    upload_dir = create_upload_folder("images")
    
    # 고유한 파일명 생성
    file_extension = file.filename.split('.')[-1].lower()
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = upload_dir / unique_filename
    
    # 파일 저장
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(file_content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"파일 저장 중 오류가 발생했습니다: {str(e)}"
        )
    
    # 파일 정보 반환
    file_url = f"/uploads/images/{unique_filename}"
    return {
        "filename": unique_filename,
        "original_filename": file.filename,
        "url": file_url,
        "size": len(file_content),
        "size_formatted": format_file_size(len(file_content)),
        "content_type": file.content_type,
        "message": "파일이 성공적으로 업로드되었습니다."
    }


@router.post("/images", response_model=dict)
async def upload_multiple_images(
    *,
    db: Session = Depends(deps.get_db),
    files: List[UploadFile] = File(...),
    current_user: models.User = Depends(deps.get_current_user),
):
    """
    여러 이미지 파일 동시 업로드
    """
    if len(files) > 10:  # 최대 10개 파일 제한
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="한 번에 최대 10개의 파일만 업로드할 수 있습니다."
        )
    
    uploaded_files = []
    failed_files = []
    
    # 업로드 디렉토리 생성
    upload_dir = create_upload_folder("images")
    
    for file in files:
        try:
            # 파일 확장자 검사
            if not allowed_file(file.filename, settings.ALLOWED_IMAGE_EXTENSIONS):
                failed_files.append({
                    "filename": file.filename,
                    "error": f"허용되지 않는 파일 형식입니다. 허용되는 형식: {', '.join(settings.ALLOWED_IMAGE_EXTENSIONS)}"
                })
                continue
            
            # 파일 크기 검사
            file_content = await file.read()
            if len(file_content) > settings.MAX_FILE_SIZE:
                failed_files.append({
                    "filename": file.filename,
                    "error": f"파일 크기가 제한을 초과했습니다. (최대: {format_file_size(settings.MAX_FILE_SIZE)})"
                })
                continue
            
            # 고유한 파일명 생성
            file_extension = file.filename.split('.')[-1].lower()
            unique_filename = f"{uuid.uuid4()}.{file_extension}"
            file_path = upload_dir / unique_filename
            
            # 파일 저장
            with open(file_path, "wb") as buffer:
                buffer.write(file_content)
            
            # 성공한 파일 정보 추가
            uploaded_files.append({
                "filename": unique_filename,
                "original_filename": file.filename,
                "url": f"/uploads/images/{unique_filename}",
                "size": len(file_content),
                "size_formatted": format_file_size(len(file_content)),
                "content_type": file.content_type
            })
            
        except Exception as e:
            failed_files.append({
                "filename": file.filename,
                "error": f"파일 저장 중 오류가 발생했습니다: {str(e)}"
            })
    
    return {
        "uploaded_files": uploaded_files,
        "failed_files": failed_files,
        "total_uploaded": len(uploaded_files),
        "total_failed": len(failed_files),
        "message": f"{len(uploaded_files)}개 파일이 성공적으로 업로드되었습니다."
    }


@router.delete("/image/{filename}")
async def delete_image(
    *,
    filename: str,
    current_user: models.User = Depends(deps.get_current_user),
):
    """
    업로드된 이미지 파일 삭제
    """
    file_path = Path("uploads/images") / filename
    
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="파일을 찾을 수 없습니다."
        )
    
    try:
        os.remove(file_path)
        return {"message": "파일이 성공적으로 삭제되었습니다."}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"파일 삭제 중 오류가 발생했습니다: {str(e)}"
        )


@router.get("/info/{filename}")
async def get_file_info(
    *,
    filename: str,
    current_user: models.User = Depends(deps.get_current_user),
):
    """
    업로드된 파일 정보 조회
    """
    file_path = Path("uploads/images") / filename
    
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="파일을 찾을 수 없습니다."
        )
    
    file_stat = file_path.stat()
    
    return {
        "filename": filename,
        "url": f"/uploads/images/{filename}",
        "size": file_stat.st_size,
        "size_formatted": format_file_size(file_stat.st_size),
        "created_at": file_stat.st_ctime,
        "modified_at": file_stat.st_mtime
    }
