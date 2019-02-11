# somesvc

A simple service that returns an ever-increasing local
counter along with an extra message provided by the environment.

`00-src` contains the actual service implementation along a
`Dockerfile`.  The idea is to build the images on minikube's
docker itself.

```
$ cd 00-src
$ eval $(minikube docker-env)
$ docker build -t stesie/somesvc:v1 .
```

The `10-kube-basic` folder contains basic YAMLs to configure
deployment & service on Kubernetes.

