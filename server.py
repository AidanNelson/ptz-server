from flask import Flask, request, make_response, send_from_directory
from flask_cors import CORS
from multiprocessing import Process, Queue, SimpleQueue

import math
import time

# NDI Initialization
import numpy as np
import cv2 as cv
import NDIlib as ndi

# PTZ Free-D
import socket

# Set Free-D parameters
localIP = "192.168.14.11"
localPort = 5555
bufferSize = 1024

def parseFreeD(packet):
    bytes = packet[0]
    # id
    # id = bytes[0]
    # pan
    pan = int.from_bytes([bytes[2], bytes[3], bytes[4]], byteorder='big', signed=True)/32768
    # tilt
    tilt = int.from_bytes([bytes[5], bytes[6], bytes[7]], byteorder='big', signed=True)/32768
    # zoom
    zoom = int.from_bytes([bytes[20], bytes[21], bytes[22]], byteorder='big', signed=True)
    return (pan, tilt, zoom)
# 



flask_app = Flask(__name__)
CORS(flask_app)

# these queues allow us to pass data to other processes
free_d_queue = SimpleQueue()
ndi_queue = SimpleQueue()

# for debugging
debug_mode = True

@flask_app.route('/', defaults=dict(filename=None))
@flask_app.route('/<path:filename>', methods=['GET', 'POST'])
def index(filename):
    filename = filename or 'index.html'
    if request.method == 'GET':
        return send_from_directory('./web-control/', filename)

@flask_app.route("/ptz_command", methods=["POST", "OPTIONS"])
def send_ptz_command():
    if request.method == "OPTIONS": # CORS preflight
        print("OPTIONS")
        response = make_response()
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add('Access-Control-Allow-Headers', "*")
        response.headers.add('Access-Control-Allow-Methods', "*")
        return response
    elif request.method == "POST": # The actual request following the preflight
        print("POST")

        # get value from request
        desired_ptz = request.get_json()
        print(desired_ptz['pan'])
        ndi_queue.put([desired_ptz['pan'], desired_ptz['tilt'], desired_ptz['zoom']])

        # send NDI commands here
        
        response = make_response()
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response
    else:
        raise RuntimeError("Weird - don't know how to handle method {}".format(request.method))

@flask_app.route("/ptz_status", methods=["POST", "OPTIONS"])
def get_ptz_status():
    if request.method == "OPTIONS": # CORS preflight
        print("OPTIONS")
        response = make_response()
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add('Access-Control-Allow-Headers', "*")
        response.headers.add('Access-Control-Allow-Methods', "*")
        return response
    
    elif request.method == "POST": # The actual request following the preflight
        print("returning latest value from birddog")
        # get latest value from queue
        latest_value = [0,0,0]
        while not free_d_queue.empty():
            latest_value = free_d_queue.get()
            
        print("latest_value: " + str(latest_value))
        data =  {"ptz": latest_value}

        # get value from request
        # desired_ptz = request.get_json()
        # print(desired_ptz)

        # send NDI commands here?
        
        if debug_mode:
            data = {"ptz": [(175*math.sin(time.time()/10)) * 0.01,(70*math.sin(time.time()/10)) * 1,0]}
        
        response = make_response(data)
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response
    else:
        raise RuntimeError("Weird - don't know how to handle method {}".format(request.method))

def free_d_loop(q):
    UDPServerSocket = socket.socket(family=socket.AF_INET, type=socket.SOCK_DGRAM)
    UDPServerSocket.bind((localIP, localPort))
    q.put([0,0,0])

    while(True):
        # print("ok")
        bytesAddressPair = UDPServerSocket.recvfrom(bufferSize)
        (pan, tilt, zoom) = parseFreeD(bytesAddressPair)
        # print(str(pan)+" " + str(tilt) + " " + str(zoom))
        q.put([pan,tilt,zoom])


def ndi_loop(ndi_queue):
    if not ndi.initialize():
        return 0

    ndi_find = ndi.find_create_v2()

    if ndi_find is None:
        return 0

    sources = []
    while not len(sources) > 0:
        print('Looking for sources ...')
        ndi.find_wait_for_sources(ndi_find, 1000)
        sources = ndi.find_get_current_sources(ndi_find)
        print(sources[0])

    ndi_recv_create = ndi.RecvCreateV3(sources[0])
    ndi_recv_create.color_format = ndi.RECV_COLOR_FORMAT_BGRX_BGRA

    ndi_recv = ndi.recv_create_v3(ndi_recv_create)

    if ndi_recv is None:
        return 0

    ndi.recv_connect(ndi_recv, sources[0])
    ndi.find_destroy(ndi_find)
    cv.startWindowThread()

    ptz_enabled = False

    while True:
        t, v, _, _ = ndi.recv_capture_v2(ndi_recv, 10)
        # we'll use this negative zoom value to check whether a new status has b
        received_command = False
        latest_value = [0,0,0]

        while not ndi_queue.empty():
            received_command=True
            latest_value = ndi_queue.get()

        if received_command and ptz_enabled:
            print("Got command: " +  str(latest_value))
            # ndi.recv_ptz_zoom(ndi_recv,0.75)
            ndi.recv_ptz_pan_tilt_speed(ndi_recv, latest_value[0], latest_value[1])

        # if t == ndi.FRAME_TYPE_METADATA:
        #     print("~~ METADATA ~~")
        #     print(frame)
        #     print("~~~~~~~~~~~~~~~~")

        # if t == ndi.FRAME_TYPE_VIDEO:
        #     # print('Video data received (%dx%d).' % (v.xres, v.yres))
        #     frame = np.copy(v.data)
        #     cv.imshow('ndi image', frame)
        #     ndi.recv_free_video_v2(ndi_recv, v)

        if t == ndi.FRANE_TYPE_STATUS_CHANGE:
            print ("FRAME STATUS CHANGE")
            ptz_enabled = ndi.recv_ptz_is_supported(ndi_recv)
            print("PTZ is enabled? " + str(ptz_enabled))
            
        # if cv.waitKey(1) & 0xff == ord('q'):
        #     break

        # if cv.waitKey(1) & 0xff == ord('z') and ptz_enabled:
        #     print("Setting Zoom to 0.75")
        #     ndi.recv_ptz_zoom(ndi_recv,0.75)

        # if cv.waitKey(1) & 0xff == ord('c') and ptz_enabled:
        #     print("Setting Zoom to 0.25")
        #     ndi.recv_ptz_zoom(ndi_recv,0.25)
            

    ndi.recv_destroy(ndi_recv)
    ndi.destroy()
    cv.destroyAllWindows()

    return 0


if __name__ == "__main__":
    p = Process(target=free_d_loop, args=(free_d_queue,))
    p.start()

    ndi_process = Process(target=ndi_loop, args=(ndi_queue,))
    ndi_process.start()

    flask_app.run(debug=False, use_reloader=False)

    p.join()    
