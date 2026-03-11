(copy of dockerdesktop-refference.md)

PS C:\Users\Simas\Documents\socket.io-main\socket.io-main\examples\private-messaging\server> docker compose down
PS C:\Users\Simas\Documents\socket.io-main\socket.io-main\examples\private-messaging\server> docker compose up -d
[+] up 2/2
 ✔ Network server_default   Created                                                         0.3s
 ✔ Container server-redis-1 Created                                                         0.4s
Error response from daemon: failed to set up container networking: driver failed programming external connectivity on endpoint server-redis-1 (e1e6dfdbe44848ba8f222fa181de4946db1957a3c6d2d771f1a3986638ebb801): Bind for 0.0.0.0:6379 failed: port is already allocated     
PS C:\Users\Simas\Documents\socket.io-main\socket.io-main\examples\private-messaging\server> docker ps -a
CONTAINER ID   IMAGE                     COMMAND                  CREATED          STATUS                   PORTS                                         NAMES
d1ba165cd99b   redis:7                   "docker-entrypoint.s…"   55 seconds ago   Created                                                                server-redis-1
3373e4741ce5   redis:7                   "docker-entrypoint.s…"   26 minutes ago   Up 26 minutes            0.0.0.0:6379->6379/tcp, [::]:6379->6379/tcp   redis
6d622dda1a68   code-interpreter:latest   "python3"                2 weeks ago      Exited (0) 2 weeks ago                                                 romantic_boyd

PS C:\Users\Simas\Documents\socket.io-main\socket.io-main\examples\private-messaging\server> # or to filter output:
PS C:\Users\Simas\Documents\socket.io-main\socket.io-main\examples\private-messaging\server> docker ps -a --format "table {{.ID}}\t{{.Names}}\t{{.Ports}}" | Select-String 6379

3373e4741ce5   redis            0.0.0.0:6379->6379/tcp, [::]:6379->6379/tcp


PS C:\Users\Simas\Documents\socket.io-main\socket.io-main\examples\private-messaging\server> docker rm server-redis-1
server-redis-1
PS C:\Users\Simas\Documents\socket.io-main\socket.io-main\examples\private-messaging\server> docker ps -a
>>
CONTAINER ID   IMAGE                     COMMAND                  CREATED          STATUS                      PORTS     NAMES
3373e4741ce5   redis:7                   "docker-entrypoint.s…"   27 minutes ago   Exited (0) 26 seconds ago             redis
6d622dda1a68   code-interpreter:latest   "python3"                2 weeks ago      Exited (0) 2 weeks ago                romantic_boyd 
PS C:\Users\Simas\Documents\socket.io-main\socket.io-main\examples\private-messaging\server> dir .\data
PS C:\Users\Simas\Documents\socket.io-main\socket.io-main\examples\private-messaging\server> docker logs -f redis
1:C 10 Mar 2026 22:33:38.232 * oO0OoO0OoO0Oo Redis is starting oO0OoO0OoO0Oo
1:C 10 Mar 2026 22:33:38.232 * Redis version=7.4.8, bits=64, commit=00000000, modified=0, pid=1, just started
1:C 10 Mar 2026 22:33:38.232 # Warning: no config file specified, using the default config. In order to specify a config file use redis-server /path/to/redis.conf
1:M 10 Mar 2026 22:33:38.233 * monotonic clock: POSIX clock_gettime
1:M 10 Mar 2026 22:33:38.234 * Running mode=standalone, port=6379.
1:M 10 Mar 2026 22:33:38.235 * Server initialized
1:M 10 Mar 2026 22:33:38.236 * Ready to accept connections tcp
1:signal-handler (1773183654) Received SIGTERM scheduling shutdown...
1:M 10 Mar 2026 23:00:54.120 * User requested shutdown...
1:M 10 Mar 2026 23:00:54.123 * Saving the final RDB snapshot before exiting.
1:M 10 Mar 2026 23:00:54.158 * DB saved on disk
1:M 10 Mar 2026 23:00:54.159 # Redis is now ready to exit, bye bye...
