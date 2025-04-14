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

TO DO
go through recuploads collection and any receipt with image  like https://fido-api.torama.ng//var/www/uploads/torama/recuploads2/5ff5752c01599b0fc08bb574/5ff5752c01599b0fc08bb574-165 having '/var/www/'  be string replaced with '



or 
'https://fido-api.torama.ng//var/www/' becomes 'https://fido-api.torama.ng/'

DATA API
https://data.mongodb-api.com/app/data-tmhml/endpoint/data/v1