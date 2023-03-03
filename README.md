# PTZ Server (Work in Progress)

This python server communicates with pan-tilt-zoom (PTZ) cameras using the NDI and Free-D protocols. Commands are issued using NDI (via the [ndi-python](https://github.com/buresu/ndi-python) library) and status is read from the camera using the free-d protocol. A Flask server opens up an HTTP API with two endpoints: for querying current camera state (as read by Free-D) and for issuing a command to the camera (using NDI's PTZ commands).

## Instructions

1. Install dependencies using pip (python package manager):

```sh
pip install ndi-python flask flask_cors cv2 numpy
```

2. Start the server:

```sh
python server.py
```

3. Access the web controller at http://127.0.0.1:5000.

![a webpage shows a simple representation of a pan-tilt-zoom camera in a 3D environment](./docs/web-control.png)

## Links

- Equirectangular Image from [PolyHaven](https://polyhaven.com/a/vestibule)
