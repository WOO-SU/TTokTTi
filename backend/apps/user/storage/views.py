# apps/storage/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from .sas import make_upload_sas, make_read_sas

class IssueUploadSASView(APIView):
    permission_classes = [permissions.IsAuthenticated]  # 필요 없으면 바꿔도 됨

    def post(self, request):
        filename = request.data.get("filename")  # optional
        content_type = request.data.get("content_type")  # optional
        container = request.data.get("container")  # optional (compliance, target, assessment 등)
        payload = make_upload_sas(filename=filename, content_type=content_type, container=container)
        return Response(payload, status=status.HTTP_200_OK)

class IssueDownloadSASView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        blob_name = request.data.get("blob_name")
        if not blob_name:
            return Response({"detail": "blob_name is required"}, status=status.HTTP_400_BAD_REQUEST)
        payload = make_read_sas(blob_name=blob_name)
        return Response(payload, status=status.HTTP_200_OK)
