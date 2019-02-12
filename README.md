# Kubernetes 101 Meetup

DevOps Meetup Würzburg, 2019-02-12

By Stefan Siegl, aka Rolf.  
Twitter: https://twitter.com/stesie23  
Developer at [Mayflower](https://mayflower.de/).

Got questions?  E-Mail: rolf@mayflower.de

# Kubernetes Workshop

Kubernetes is a Container Orchestrator

* Docker = single container
* docker-compose = multiple containers
* Kubernetes = multiple containers on multiple machines

... forget about Docker Swarm :)

For today we don't care about Kubernetes on Rkt or Firecracker...

# Getting Started

## Minikube

* Install *minikube* and *kubectl*, see https://kubernetes.io/docs/tasks/tools/install-minikube/

```
$ minikube start --memory 8192
... keep waiting ...
$ kubectl config current-context
minikube
```

after installation the pod list should look like this:

```
$ kubectl -n kube-system get pods
NAME                                   READY     STATUS    RESTARTS   AGE
coredns-86c58d9df4-thf4x               1/1       Running   0          36s
coredns-86c58d9df4-vnfsl               1/1       Running   0          36s
kube-proxy-tqrmc                       1/1       Running   0          36s
kubernetes-dashboard-ccc79bfc9-q5866   1/1       Running   0          33s
storage-provisioner                    1/1       Running   0          33s
```

Kubernetes also has a dashboard, just run `minikube dashboard` to launch the
necessary proxy and call your browser.  Do it once, and never go there ever after :)

# Kubernetes Basics

## Architecture

![Kubernetes Overview](./assets/architecture.png)
Source: https://de.wikipedia.org/wiki/Kubernetes#/media/File:Kubernetes.png; CC-BY-SA 4.0

Plugin concept, to support multiple software defined networks (and different cloud providers).

It allows to integrate with cloud provider's load balancers and authentication mechanisms (like AWS IAM & ELB/ALB/NLB)

For the moment let's keep it stateless :-)

## Concepts

* everything is a resource
* resource types: pods, replica set, controller, service, ingress ...
* ... even custom resource definitions (CRDs), out of scope for today
* declared as yaml
* controllers constantly compare declared state with actual state -> apply changes as needed
* names, labels & annotations
  * every resource has a unique name (unique within resource type & namespace)
  * labels are arbitrary key/value pairs
  * other resources are selected by querying for labels
  * annotations are further key/value attributes on resources, mostly for third-party stuff

## Pods

* smallest managed part in Kubernetes
* pods are immutable!
* set of containers (usually one, use only for containers that can't do without others)
* init containers (may be multiple ones, run one after another)
* share network space, i.e. *localhost*

### Create Pod

(word of caution: you don't usually do that)

The (evil) Imperative Way ...

```
$ kubectl run my-first-pod --image=nginx --labels=env=test,foo=web-server --restart=Never
```

... the `--restart=Never` is needed because kubectl is to intelligent.  It defaults to `Always`
and hence would create a deployment.  Ignore for the moment :-)

```
$ kubectl get pods
NAME           READY     STATUS    RESTARTS   AGE
my-first-pod   1/1       Running   0          104s
```

... this is just the very excerpt of the actual resource definition :-)

There's more to it

```
$ kubectl get pods -o wide
NAME           READY     STATUS    RESTARTS   AGE       IP           NODE       NOMINATED NODE   READINESS GATES
my-first-pod   1/1       Running   0          2m48s     172.17.0.5   minikube   <none>           <none>
```

also can show the labels ...

```
$ kubectl get pods -L env -L foo
NAME           READY     STATUS    RESTARTS   AGE       ENV       FOO
my-first-pod   1/1       Running   0          4m3s      test      web-server
```

Or get the full yaml ...

```
$ kubectl get pods/my-first-pod -o yaml
apiVersion: v1
kind: Pod
metadata:
  creationTimestamp: 2019-02-11T20:59:45Z
  labels:
    env: test
    foo: web-server
  name: my-first-pod
  namespace: default
  resourceVersion: "1115"
  selfLink: /api/v1/namespaces/default/pods/my-first-pod
  uid: f6141a11-2e3f-11e9-aa8c-08002751778f
 ... moaaaar ...
```

... just shown for Pods here.  Of course this works for other resources likewise.

### Delete Pod

```
$ kubectl delete pod/my-first-pod
pod "my-first-pod" deleted
```

### Create Pod Again

... declarative way

copy & paste some yaml (or just go with `00-first-steps/some-simple-pod.yml`)

```
apiVersion: v1
kind: Pod
metadata:
  labels:
    env: test
    foo: web-server
  name: my-first-pod
spec:
  containers:
  - image: nginx
    imagePullPolicy: IfNotPresent
    name: cute-little-container
  restartPolicy: Never
```

... and apply it

```
$ kubectl  apply -f 00-first-steps/some-simple-pod.yml 
pod/my-first-pod created
```

```
$ kubectl get po
NAME           READY     STATUS    RESTARTS   AGE
my-first-pod   1/1       Running   0          79s
```

... same result \o/

#### what are the options?

```
$ kubectl explain pod
$ kubectl explain pod.spec
$ kubectl explain pod.spec.containers
```

## Service

* named, static endpoint for pods
* different types
  * ClusterIP (default) = internal service discovery
  * NodePort = allocate port on node + forward traffic (= use on Minikube!)
  * LoadBalancer = allocate a load balancer (e.g. AWS ELB, etc.)
* matches pods by label query

```
kind: Service
apiVersion: v1
metadata:
  name: foo-server-svc
spec:
  selector:
    foo: web-server
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
```

```
$ kubectl apply -f 00-first-steps/foo-server-svc.yml 
service/foo-server-svc unchanged
```

By the way, you can apply a full directory as well :-)

List existing services:

```
$ kubectl  get svc -o wide
NAME                  TYPE           CLUSTER-IP       EXTERNAL-IP   PORT(S)                      AGE       SELECTOR
foo-server-svc        ClusterIP      10.108.138.230   <none>        80/TCP                       7s        foo=web-server
kubernetes            ClusterIP      10.96.0.1        <none>        443/TCP                      51m       <none>
```

... it's there.  You just can't reach it.

Well ...

```
$ kubectl run debugging -ti --image alpine --restart=Never
If you don't see a command prompt, try pressing enter.
/ # apk update
fetch http://dl-cdn.alpinelinux.org/alpine/v3.9/main/x86_64/APKINDEX.tar.gz
fetch http://dl-cdn.alpinelinux.org/alpine/v3.9/community/x86_64/APKINDEX.tar.gz
v3.9.0-20-g21303c6061 [http://dl-cdn.alpinelinux.org/alpine/v3.9/main]
v3.9.0-16-gfe0ab7c606 [http://dl-cdn.alpinelinux.org/alpine/v3.9/community]
OK: 9750 distinct packages available
/ # apk add curl
(1/5) Installing ca-certificates (20190108-r0)
(2/5) Installing nghttp2-libs (1.35.1-r0)
(3/5) Installing libssh2 (1.8.0-r4)
(4/5) Installing libcurl (7.63.0-r0)
(5/5) Installing curl (7.63.0-r0)
Executing busybox-1.29.3-r10.trigger
Executing ca-certificates-20190108-r0.trigger
OK: 7 MiB in 19 packages
/ # curl http://foo-server-svc/
<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
<style>
    body {
        width: 35em;
        margin: 0 auto;
        font-family: Tahoma, Verdana, Arial, sans-serif;
    }
</style>
</head>
<body>
<h1>Welcome to nginx!</h1>
<p>If you see this page, the nginx web server is successfully installed and
working. Further configuration is required.</p>

<p>For online documentation and support please refer to
<a href="http://nginx.org/">nginx.org</a>.<br/>
Commercial support is available at
<a href="http://nginx.com/">nginx.com</a>.</p>

<p><em>Thank you for using nginx.</em></p>
</body>
</html>
```

... **as you can see, every service can be accessed via DNS using just its name**.

## Log Output

Since we just curl'ed our nginx, there's log output now.  Let's have a look at it:

```
$ kubectl logs my-first-pod
172.17.0.8 - - [11/Feb/2019:21:44:25 +0000] "GET / HTTP/1.1" 200 612 "-" "curl/7.63.0" "-"
```

## More Layers on those Layers: Helm

... a package manager for Kubernetes.

It has two parts, client-side cli tool (helm) and server-side helper (Tiller).

First install *Helm* from https://docs.helm.sh/using_helm/#installing-helm
... either curl + chmod; or use *brew*

```
$ helm version
Client: &version.Version{SemVer:"v2.9.1", GitCommit:"20adb27c7c5868466912eebdf6664e7390ebe710", GitTreeState:"clean"}
Server: &version.Version{SemVer:"v2.9.1", GitCommit:"20adb27c7c5868466912eebdf6664e7390ebe710", GitTreeState:"clean"}
```

### Install tiller 

... and ignore security warning:

```
$ helm init
$HELM_HOME has been configured at /home/stesie/.helm.

Tiller (the Helm server-side component) has been installed into your Kubernetes Cluster.

Please note: by default, Tiller is deployed with an insecure 'allow unauthenticated users' policy.
For more information on securing your installation see: https://docs.helm.sh/using_helm/#securing-your-helm-installation
Happy Helming!
```

### Search for packages

```
$ helm search traefik
NAME          	CHART VERSION	APP VERSION	DESCRIPTION                                       
stable/traefik	1.52.6       	1.7.4      	A Traefik based Kubernetes ingress controller w...
```

### Install a package

```
$ helm install stable/traefik --set rbac.enabled=true
NAME:   tan-warthog
LAST DEPLOYED: Mon Feb 11 22:22:45 2019
NAMESPACE: default
STATUS: DEPLOYED

RESOURCES:
==> v1/ConfigMap
NAME                 DATA  AGE
tan-warthog-traefik  1     0s

==> v1/Service
NAME                 TYPE          CLUSTER-IP     EXTERNAL-IP  PORT(S)                     AGE
tan-warthog-traefik  LoadBalancer  10.101.130.89  <pending>    80:31709/TCP,443:31000/TCP  0s

==> v1/Deployment
NAME                 DESIRED  CURRENT  UP-TO-DATE  AVAILABLE  AGE
tan-warthog-traefik  1        1        1           0          0s

==> v1/Pod(related)
NAME                                  READY  STATUS             RESTARTS  AGE
tan-warthog-traefik-78c8784fc6-4rwst  0/1    ContainerCreating  0         0s
```

... it automatically assigns a random name (unless you specify `--name`).
You can use it to update (it's actually *upgrade*) & uninstall stuff.

```
$ helm upgrade tan-warthog stable/traefik
$ helm delete --purge tan-warthog
```

## Ingress

You don't want to just publish ports, right?  And we also have a reverse proxy (traefik) installed.

```
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: foo-server-ingress
spec:
  backend:
    serviceName: foo-server-svc
    servicePort: 80
```

```
$ kubectl apply -f 00-first-steps/foo-server-ingress.yml
ingress.extensions/foo-server-ingress created
```

Since Minikube doesn't support load balancer you need to live with the NodePort mapping.
See the service list for the external port number of you traefik service.

```
$ kubectl get svc
NAME                  TYPE           CLUSTER-IP       EXTERNAL-IP   PORT(S)                      AGE
foo-server-svc        ClusterIP      10.108.138.230   <none>        80/TCP                       7m49s
kubernetes            ClusterIP      10.96.0.1        <none>        443/TCP                      59m
tan-warthog-traefik   LoadBalancer   10.101.130.89    <pending>     80:31709/TCP,443:31000/TCP   26m
```

... in my case it's 31709.  Together with Minikube's IP address we can start to cURL ...

```
$ minikube ip
192.168.99.100
```

## Replica Set

* managed set of pods
* all of the same *template*

Directly using Pods is not the way to go.  If things go nuts, the Pod is gone and Kubernetes does **not**
care to recreate it for us.  (like moving it to a different node, if resources get scarce)

But we don't really want to use Replica Sets either, since ...

## Controller

* manages replica sets
* ... think of "update strategy for replica set"

### De-tour: we can build images on Minikube's Docker

```
$ eval $(minikube docker-env)

$ docker build -t stesie/somesvc:v1 10-somesvc/00-src/
Sending build context to Docker daemon  14.34kB
Step 1/6 : FROM node:8-alpine
8-alpine: Pulling from library/node
169185f82c45: Pull complete 
62154f231947: Pull complete 
acf10a8404b6: Pull complete 
Digest: sha256:812e5a88e7dc8e8d9011f18a864d2fd7da4d85b6d77c545b71a73b13c1f4993e
Status: Downloaded newer image for node:8-alpine
 ---> e8ae960eaa9e
Step 2/6 : COPY / /app
 ---> 50b6710dbf79
Step 3/6 : WORKDIR /app
 ---> Running in bde379c2718c
Removing intermediate container bde379c2718c
 ---> a875af3a9bf6
Step 4/6 : RUN yarn install
 ---> Running in d900bdc20af6
yarn install v1.12.3
warning package.json: No license field
warning No license field
[1/4] Resolving packages...
[2/4] Fetching packages...
[3/4] Linking dependencies...
[4/4] Building fresh packages...
Done in 30.65s.
Removing intermediate container d900bdc20af6
 ---> d58474e5f9f6
Step 5/6 : CMD node index.js
 ---> Running in 64ac06263609
Removing intermediate container 64ac06263609
 ---> 06163cc96620
Step 6/6 : EXPOSE 3000
 ---> Running in d573b323959e
Removing intermediate container d573b323959e
 ---> f07c330eae7c
Successfully built f07c330eae7c
Successfully tagged stesie/somesvc:v1
```

... so your Kubernetes' Docker now knows about an image named *stesie/somesvc:v1*.

### Create a Deployment

... along with a Service and an Ingress.

```
$ kubectl apply -f 10-somesvc/10-kube-basic/deployment-somesvc-v1.yml
deployment.apps/somesvc-v1 created

$ kubectl apply -f 10-somesvc/10-kube-basic/service.yml 
service/somesvc created

$ kubectl apply -f 10-somesvc/10-kube-basic/ingress.yml 
ingress.extensions/somesvc-ingress created
```

... since the deployment specified three replicas it's automatically load-balancing:

```
$ curl -HHost:somesvc.minikube http://192.168.99.100:31709/
Request counter: 1.  This request was served to you by somesvc-v1-7b878f7cdf-bmbrb :-)
das hier ist Version 1 :-)
$ curl -HHost:somesvc.minikube http://192.168.99.100:31709/
Request counter: 1.  This request was served to you by somesvc-v1-7b878f7cdf-jg4mg :-)
das hier ist Version 1 :-)
$ curl -HHost:somesvc.minikube http://192.168.99.100:31709/
Request counter: 1.  This request was served to you by somesvc-v1-7b878f7cdf-z8wfb :-)
das hier ist Version 1 :-)
$ curl -HHost:somesvc.minikube http://192.168.99.100:31709/
Request counter: 2.  This request was served to you by somesvc-v1-7b878f7cdf-bmbrb :-)
das hier ist Version 1 :-)
```

### Deploy a second version

```
$ kubectl apply -f 10-somesvc/10-kube-basic/deployment-somesvc-v2.yml 
deployment.apps/somesvc-v2 created
```

... we've deployed three instances of v1 and two instances of v2 now.

Since the service matches both, it's load balancing between those five instances
with a 60/40 traffic split between the versions.

```
$ curl -HHost:somesvc.minikube http://192.168.99.100:31709/
Request counter: 1.  This request was served to you by somesvc-v2-7fc5f9c485-zsdwv :-)
und das hier ist v2!
$ curl -HHost:somesvc.minikube http://192.168.99.100:31709/
Request counter: 3.  This request was served to you by somesvc-v1-7b878f7cdf-bmbrb :-)
das hier ist Version 1 :-)
```

With plain Kubernetes you'll always get this round robin thing.  For more fine-grained
routing use a Service Mesh like Istio.

## Rollout/Rollback

Deployments support in-place, rolling updates.  Therefore let's first undeploy the
existing two deployments.

```
$ kubectl delete deployment/somesvc-v1
deployment.extensions "somesvc-v1" deleted

$ kubectl delete deployment/somesvc-v2
deployment.extensions "somesvc-v2" deleted
```

... cURL'ing should result in *Service Unavailable* responses.

Now run `kubectl apply -f 10-somesvc/20-rolling-update/deployment-somesvc-v1.yml` to deploy
the first version as `deployment/somesvc`.

Then run `kubectl apply -f 10-somesvc/20-rolling-update/deployment-somesvc-v2.yml` to update
the existing deployment resource with settings from second version.

Keep cURL'ing in parallel and see how the traffic gradually shifts to the new versions.

Use `kubectl rollout undo deployment/somesvc` to undo the deployment.

# Stuff Ignored Today

* Resource Limits
* Cronjobs
* Stateful Sets
* Persistent Volumes & PV Claims
