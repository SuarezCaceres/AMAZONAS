package com.amazonas.backend.modules.requests.dto;

import java.util.List;

public class RequestFilesUpdateRequest {
    private List<String> grabacionesUrls;
    private List<String> archivosUrls;

    public RequestFilesUpdateRequest() {}

    public RequestFilesUpdateRequest(List<String> grabacionesUrls, List<String> archivosUrls) {
        this.grabacionesUrls = grabacionesUrls;
        this.archivosUrls = archivosUrls;
    }

    public List<String> getGrabacionesUrls() {
        return grabacionesUrls;
    }

    public void setGrabacionesUrls(List<String> grabacionesUrls) {
        this.grabacionesUrls = grabacionesUrls;
    }

    public List<String> getArchivosUrls() {
        return archivosUrls;
    }

    public void setArchivosUrls(List<String> archivosUrls) {
        this.archivosUrls = archivosUrls;
    }
}
