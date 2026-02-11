appuser@localhost ~]$ echo "==================================== 系统信息 ===================================="
==================================== 系统信息 ====================================
[appuser@localhost ~]$ cat /etc/os-release | grep PRETTY_NAME
PRETTY_NAME="CentOS Linux 8 (Core)"
[appuser@localhost ~]$ uname -a
Linux localhost.localdomain 4.18.0-80.el8.x86_64 #1 SMP Tue Jun 4 09:19:46 UTC 2019 x86_64 x86_64 x86_64 GNU/Linux
[appuser@localhost ~]$ uptime
 17:07:01 up 10 days,  1:22,  6 users,  load average: 0.04, 0.08, 0.10
[appuser@localhost ~]$ 
[appuser@localhost ~]$ echo -e "\n==================================== CPU 信息 ===================================="

==================================== CPU 信息 ====================================
[appuser@localhost ~]$ lscpu | grep -E "Model name|CPU\(s\)|Architecture|CPU MHz"
CPU MHz：        800.135
[appuser@localhost ~]$ 
[appuser@localhost ~]$ echo -e "\n==================================== 内存信息 ===================================="

==================================== 内存信息 ====================================
[appuser@localhost ~]$ free -h
              total        used        free      shared  buff/cache   available
Mem:          503Gi       1.2Gi       500Gi        18Mi       1.0Gi       499Gi
Swap:         4.0Gi          0B       4.0Gi
[appuser@localhost ~]$ 
[appuser@localhost ~]$ echo -e "\n==================================== 磁盘信息 ===================================="

==================================== 磁盘信息 ====================================
[appuser@localhost ~]$ df -h | grep -E "/$|/boot"
/dev/mapper/cl-root   50G  3.4G   47G    7% /
/dev/sdb2            976M  125M  785M   14% /boot
/dev/sdb1            599M  6.7M  593M    2% /boot/efi
[appuser@localhost ~]$ lsblk | grep -v "loop"
NAME        MAJ:MIN RM   SIZE RO TYPE MOUNTPOINT
sda           8:0    0  10.9T  0 disk 
└─sda1        8:1    0   300G  0 part /home/appuser
sdb           8:16   0   223G  0 disk 
├─sdb1        8:17   0   600M  0 part /boot/efi
├─sdb2        8:18   0     1G  0 part /boot
└─sdb3        8:19   0 221.4G  0 part 
  ├─cl-root 253:0    0    50G  0 lvm  /
  ├─cl-swap 253:1    0     4G  0 lvm  [SWAP]
  └─cl-home 253:2    0 167.4G  0 lvm  /home
[appuser@localhost ~]$ 
[appuser@localhost ~]$ echo -e "\n==================================== 网络信息 ===================================="

==================================== 网络信息 ====================================
[appuser@localhost ~]$ ip a | grep -E "inet |link/ether"
    inet 127.0.0.1/8 scope host lo
    link/ether cc:96:e5:e5:66:16 brd ff:ff:ff:ff:ff:ff
    inet 192.168.8.23/24 brd 192.168.8.255 scope global dynamic noprefixroute eno8303
    link/ether cc:96:e5:e5:66:17 brd ff:ff:ff:ff:ff:ff
[appuser@localhost ~]$ ss -tuln | grep -E "LISTEN"
tcp    LISTEN   0        128               0.0.0.0:22            0.0.0.0:*      
tcp    LISTEN   0        128                  [::]:22               [::]:*      
[appuser@localhost ~]$ 
[appuser@localhost ~]$ echo -e "\n==================================== 用户信息 ===================================="

==================================== 用户信息 ====================================
[appuser@localhost ~]$ whoami
appuser
[appuser@localhost ~]$ users^C
[appuser@localhost ~]$ ^C
[appuser@localhost ~]$ 