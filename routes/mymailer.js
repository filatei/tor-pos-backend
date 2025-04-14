
function sendMail(order) {
    const smtpTransport = nodemailer.createTransport({
        service: "gmail",
        auth: {
            type: "OAuth2",
            user: process.env.tormail, 
            clientId: tokens.clientID,
            clientSecret: tokens.clientSecret,
            refreshToken: tokens.refresh_token,
            accessToken: tokens.access_token
        }
   });
  
   // some content
   let orderId = order.rec_id || new Date().getTime();
   let subject = order.subject || `ShopTorama Order Confirmation for Order (# ${orderId})`
   let curr = order.curr || process.env.naira
   let total = order.txn_amount;
   
   let customer = order.customerName
   let products = order.products 
  
   let product = `<table><tr> <th>Qty</th><th>Product</th><th>Price</th> <th>Amount</th></tr>`;
   
   products.forEach(p => {
    product += `<tr><td>${p.qty}</td> x<td> ${p.name}</td><td> ${p.price} </td><td>${curr} ${p.qty * p.price} </td><tr>`
   })

   product += `</table>`;
  
   let html = `<div style=" margin: auto;width: 50%;border: 3px solid green;padding: 10px;"><h3>ORDER CONFIRMED</h3><p> Hi ${customer},</p>`;
   html += `<p>We received your order # ${orderId} for ${curr} ${total}.</p>`;
   html += `<h3>Products</h3> ${product}`;
   html += `<h5>Order summary</h5><p> Subtotal: ${curr} ${total} </p> <p>Tax: N 0.00</p> <p>Total: ${curr} ${total}</p>`;
   
   html += `<h6 style="background-color='#999999'">ShopTorama - All rights reserved</h6> </div>`;
  
   const mailOptions = {
        from: `ShopTorama ${process.env.tormail}`,
        to: process.env.tormail,
        subject: subject,
        generateTextFromHTML: true,
        html: html
    };
  
    // send mail
    smtpTransport.sendMail(mailOptions, (error, response) => {
      error ? console.log(error) : console.log(response);
      smtpTransport.close();
    });
  }


module.exports = {
    sendMail
    
}