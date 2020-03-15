print to pos printer
route  to use req.body and post
body to have the receipt data.

restart pm2 on reboot
1.  sudo env PATH=$PATH:/usr/local/bin pm2 startup systemd -u pi --hp /home/pi
2.  sudo systemctl enable pm2-pi
     cd /opt/torpos
     npm start
     pm2 save
3.  sudo reboot