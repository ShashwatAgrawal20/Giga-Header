#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <microhttpd.h>

#define PORT 8080

const char *response_page = 
    "<html><body><h1>C to Header-Only Converter</h1>"
    "<p>Server is working!</p></body></html>";

enum MHD_Result handle_request(void *cls, struct MHD_Connection *connection,
                               const char *url, const char *method,
                               const char *version, const char *upload_data,
                               size_t *upload_data_size, void **con_cls) {
    
    struct MHD_Response *response;
    enum MHD_Result ret;
    
    response = MHD_create_response_from_buffer(strlen(response_page), 
                                               (void*)response_page, 
                                               MHD_RESPMEM_PERSISTENT);
    
    if (!response) {
        return MHD_NO;
    }
    
    MHD_add_response_header(response, "Content-Type", "text/html");
    ret = MHD_queue_response(connection, MHD_HTTP_OK, response);
    MHD_destroy_response(response);
    
    return ret;
}

int main() {
    struct MHD_Daemon *daemon;
    
    daemon = MHD_start_daemon(MHD_USE_INTERNAL_POLLING_THREAD, 
                             PORT, NULL, NULL,
                             &handle_request, NULL, 
                             MHD_OPTION_END);
    
    if (!daemon) {
        fprintf(stderr, "Failed to start server on port %d\n", PORT);
        return 1;
    }
    
    printf("Test server running on port %d\n", PORT);
    printf("Open http://localhost:%d in your browser\n", PORT);
    
    getchar();
    
    MHD_stop_daemon(daemon);
    return 0;
}