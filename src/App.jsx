import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
// recharts is loaded on demand inside the admin Dashboard (see DashTab) so that
// customers  who never see a chart  don't download the whole charting library
// (recharts + its d3 dependencies) as part of the initial page load.
import { supabase } from './supabaseClient';

const BANNER_TOP = "/banner-top.png";
const BANNER_SHOPNOW = "/banner-shopnow.png";
const LOGO_MAIN = "/logo.png";
const WECHAT_QR = "/wechat-qr.jpg";

// Fix 1: force light color-scheme so browser dark-mode doesn't turn
// <input>/<select>/<option> text white-on-white. Injected once at startup.
const GLOBAL_CSS = `
  :root { color-scheme: light; }
  input, select, textarea, option {
    color: #1E241F;
    background-color: #FFFFFF;
  }
  select option { color: #1E241F; background-color: #FFFFFF; }
  input::placeholder, textarea::placeholder { color: #8E948F; }
`;
function useGlobalCss(){
  useEffect(()=>{
    if(document.getElementById('tod-global-css')) return;
    const el=document.createElement('style');
    el.id='tod-global-css';
    el.textContent=GLOBAL_CSS;
    document.head.appendChild(el);
  },[]);
}

const G = {
  gd:'#15532D',gm:'#1F8A44',g:'#3CB05E',gl:'#E8F5E9',
  gold:'#F9A825',goldl:'#FFF8E1',
  bd:'#1565C0',bl:'#BBDEFB',
  rd:'#B71C1C',rl:'#FFCDD2',
  yd:'#F57F17',yl:'#FFF9C4',
  pd:'#4A148C',pl:'#E1BEE7',
  w:'#FFFFFF',bg:'#F6F7F6',bg2:'#ECEFEC',brd:'#E2E5E2',
  mut:'#8E948F',tx:'#3D4540',dk:'#1E241F',
};
G.grad = `radial-gradient(circle at 28% 18%, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0) 55%), linear-gradient(135deg, ${G.gd} 0%, #1B7D3F 55%, #2E9E57 100%)`;

const ICONS = {'Essentials':'🌾','Basic Spices':'🌿','Spice Blends':'🌶️','Desserts':'🍮','Snacks':'🥨'};

const DEFAULT_CAT_COLORS = {'Essentials':'#1565C0','Basic Spices':'#1B5E20','Spice Blends':'#B71C1C','Desserts':'#F57F17','Snacks':'#4A148C'};

const IP = [
  {id:1,name:'Aromatic Rice-Chashi',upc:'8941100512104',cat:'Essentials',unit:'PCS',pw:1000,gw:1.02,sp:35,cp:28,stock:10,disc:0,offer:false,bs:true,isNew:false,img:''},
  {id:2,name:'Aromatic Rice-Farmland',upc:'8941160037166',cat:'Essentials',unit:'PCS',pw:1000,gw:1.02,sp:35,cp:28,stock:8,disc:0,offer:false,bs:false,isNew:false,img:''},
  {id:3,name:'Mustard Oil',upc:'8941100512647',cat:'Essentials',unit:'PCS',pw:250,gw:0.27,sp:25,cp:18,stock:9,disc:0,offer:false,bs:false,isNew:false,img:''},
  {id:4,name:'Mustard Sauce-Kashundi',upc:'8941100511763',cat:'Essentials',unit:'PCS',pw:285,gw:0.305,sp:25,cp:18,stock:2,disc:0,offer:false,bs:false,isNew:false,img:''},
  {id:5,name:'Tehari Spice',upc:'8941100511961',cat:'Basic Spices',unit:'PCS',pw:40,gw:0.06,sp:12,cp:8,stock:6,disc:0,offer:false,bs:false,isNew:false,img:''},
  {id:6,name:'Biryani Spice',upc:'8941100511329',cat:'Basic Spices',unit:'PCS',pw:40,gw:0.06,sp:12,cp:8,stock:8,disc:0,offer:false,bs:true,isNew:false,img:''},
  {id:7,name:'Kacchi Biryani Spice',upc:'8941100511330',cat:'Basic Spices',unit:'PCS',pw:45,gw:0.065,sp:12,cp:8,stock:7,disc:0,offer:false,bs:false,isNew:false,img:''},
  {id:8,name:'BBQ Chanachur',upc:'8941100513194',cat:'Snacks',unit:'PCS',pw:150,gw:0.17,sp:14,cp:9,stock:4,disc:10,offer:true,bs:true,isNew:false,img:''},
  {id:9,name:'Spicy Chanachur',upc:'8941100513163',cat:'Snacks',unit:'PCS',pw:150,gw:0.17,sp:14,cp:9,stock:11,disc:0,offer:false,bs:false,isNew:false,img:''},
  {id:10,name:'Chicken Roast Spice',upc:'8941100511206',cat:'Spice Blends',unit:'PCS',pw:35,gw:0.06,sp:12,cp:8.4,stock:3,disc:0,offer:false,bs:false,isNew:false,img:''},
  {id:11,name:'Halim Mix',upc:'8941100511725',cat:'Spice Blends',unit:'PCS',pw:200,gw:0.22,sp:12,cp:8,stock:5,disc:0,offer:false,bs:false,isNew:true,img:''},
  {id:12,name:'Faluda Mix-Mango',upc:'8941100511855',cat:'Desserts',unit:'PCS',pw:250,gw:0.27,sp:22,cp:15,stock:0,disc:0,offer:false,bs:false,isNew:false,img:''},
  {id:13,name:'Fried Lentils-Ruchi',upc:'8941100511145',cat:'Snacks',unit:'PCS',pw:25,gw:0.045,sp:5,cp:3.5,stock:19,disc:0,offer:false,bs:false,isNew:false,img:''},
  {id:14,name:'Meat Spice',upc:'8941100511146',cat:'Spice Blends',unit:'PCS',pw:100,gw:0.12,sp:15,cp:10,stock:7,disc:0,offer:false,bs:false,isNew:false,img:''},
  {id:15,name:'Beef Spice',upc:'8941100511147',cat:'Spice Blends',unit:'PCS',pw:100,gw:0.12,sp:15,cp:10,stock:11,disc:0,offer:false,bs:true,isNew:false,img:''},
  {id:16,name:'Sweet Toast-Pran',upc:'8941100511148',cat:'Snacks',unit:'PCS',pw:180,gw:0.2,sp:20,cp:14,stock:6,disc:0,offer:false,bs:false,isNew:false,img:''},
  {id:17,name:'Jhal Muri',upc:'8941100511149',cat:'Snacks',unit:'PCS',pw:25,gw:0.045,sp:5,cp:3.5,stock:11,disc:0,offer:false,bs:false,isNew:false,img:''},
  {id:18,name:'Corn Soup-Maggi',upc:'8941100295878',cat:'Essentials',unit:'PCS',pw:50,gw:0.065,sp:8,cp:5,stock:4,disc:15,offer:true,bs:false,isNew:false,img:''},
  {id:19,name:'Mustard Ellish Spice',upc:'8941100511962',cat:'Basic Spices',unit:'PCS',pw:65,gw:0.08,sp:12,cp:8,stock:2,disc:0,offer:false,bs:false,isNew:true,img:''},
];

const IINV = [
  {id:1,date:'2026-03-13',ts:'21:51:44',name:'Aromatic Rice-Chashi',cat:'Essentials',qty:4,exp:'2027-01-10',sp:35,cp:28,pw:1000,upc:'8941100512104'},
  {id:2,date:'2026-03-13',ts:'21:51:44',name:'Aromatic Rice-Chashi',cat:'Essentials',qty:6,exp:'2027-02-12',sp:35,cp:28,pw:1000,upc:'8941100512104'},
  {id:3,date:'2026-03-13',ts:'21:51:44',name:'Aromatic Rice-Farmland',cat:'Essentials',qty:8,exp:'2028-02-01',sp:35,cp:28,pw:1000,upc:'8941160037166'},
  {id:4,date:'2026-03-05',ts:'21:51:44',name:'Mustard Sauce-Kashundi',cat:'Essentials',qty:2,exp:'2026-08-25',sp:25,cp:18,pw:285,upc:'8941100511763'},
  {id:5,date:'2026-02-28',ts:'21:51:44',name:'Tehari Spice',cat:'Basic Spices',qty:6,exp:'2027-05-21',sp:12,cp:8,pw:40,upc:'8941100511961'},
  {id:6,date:'2026-03-29',ts:'21:51:44',name:'Mustard Oil',cat:'Essentials',qty:9,exp:'2027-03-06',sp:25,cp:18,pw:250,upc:'8941100512647'},
  {id:7,date:'2026-02-28',ts:'21:51:44',name:'Mustard Sauce-Kashundi',cat:'Essentials',qty:0,exp:'2026-04-25',sp:25,cp:18,pw:285,upc:'8941100511763'},
  {id:8,date:'2026-04-10',ts:'10:30:00',name:'BBQ Chanachur',cat:'Snacks',qty:4,exp:'2026-02-02',sp:14,cp:9,pw:150,upc:'8941100513194'},
  {id:9,date:'2026-04-15',ts:'14:20:00',name:'Biryani Spice',cat:'Basic Spices',qty:8,exp:'2027-06-15',sp:12,cp:8,pw:40,upc:'8941100511329'},
  {id:10,date:'2026-05-01',ts:'09:00:00',name:'Chicken Roast Spice',cat:'Spice Blends',qty:3,exp:'2026-08-12',sp:12,cp:8.4,pw:35,upc:'8941100511206'},
];

const IORDERS = [
  {id:'ORD001',date:'2026-06-14',time:'10:30:00',cname:'Ashikur Rahman',mob:'13051203480',addr:'Beijing, Fangshan District, Building 23, Floor 2, Unit 301',items:[{pid:1,name:'Aromatic Rice-Chashi',qty:2,up:35,gw:1.02,disc:0}],status:'pending',tracking:[],paid:true,notes:'',discTotal:null,custCourier:null},
  {id:'ORD002',date:'2026-06-13',time:'15:45:00',cname:'Mahin',mob:'19353252051',addr:'Shandong Province, Qingdao, University of Technology',items:[{pid:8,name:'BBQ Chanachur',qty:3,up:12.6,gw:0.17,disc:10}],status:'processing',tracking:['SF123456789'],paid:true,notes:'',discTotal:null,custCourier:null},
  {id:'ORD003',date:'2026-06-10',time:'09:15:00',cname:'Rony',mob:'18810120332',addr:'Beijing, Haidian, Xueyuan Road 30, IUST',items:[{pid:1,name:'Aromatic Rice-Chashi',qty:1,up:35,gw:1.02,disc:0},{pid:10,name:'Chicken Roast Spice',qty:2,up:12,gw:0.06,disc:0}],status:'shipped',tracking:['YT123456789CN'],paid:true,notes:'',discTotal:null,custCourier:null},
];

const ISALES = [
  {id:1,seq:1,date:'2026-06-08',type:'online',oid:'ORD000',cname:'Bakky',mob:'15013912392',addr:'Shantou University, Guangdong',items:[{name:'Aromatic Rice-Chashi',qty:2,up:35,tp:70}],sub:70,disc:0,discTotal:70,courier:10,grand:80},
  {id:2,seq:2,date:'2026-06-05',type:'invoice',oid:'INV2',cname:'Syd',mob:'13041290788',addr:'Beijing, Tongzhou',items:[{name:'BBQ Chanachur',qty:2,up:12.6,tp:25.2},{name:'Spicy Chanachur',qty:2,up:14,tp:28}],sub:53.2,disc:0,discTotal:53.2,courier:5,grand:58.2},
];

const ep = p => p.offer && p.disc > 0 ? +(p.sp*(1-p.disc/100)).toFixed(2) : p.sp;
const cf = kg => kg > 0 ? Math.max(1, Math.ceil(kg)) * 5 : 0;
const bjDate = () => new Date().toISOString().split('T')[0];
const bjTime = () => new Date().toLocaleTimeString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false});
const nid = arr => arr.length > 0 ? Math.max(...arr.map(x=>x.id))+1 : 1;
const nextSeq = sales => sales.length ? Math.max(...sales.map(s=>s.seq||0))+1 : 1;

function expStyle(d) {
  if(!d) return {};
  const diff = (new Date(d) - new Date()) / 86400000;
  if(diff < 0) return {background:'#FFCDD2'};
  if(diff < 90) return {background:'#BBDEFB'};
  if(diff < 180) return {background:'#FFF9C4'};
  return {background:'#C8E6C9'};
}

function stStyle(n) {
  if(n > 10) return {background:'#C8E6C9',color:'#1B5E20',fontWeight:'bold'};
  if(n >= 5) return {background:'#FFF9C4',color:'#E65100',fontWeight:'bold'};
  return {background:'#FFCDD2',color:'#B71C1C',fontWeight:'bold'};
}

const TR = {
  en:{home:'Home',shop:'Shop',cart:'Cart',me:'Me',shopNow:'Shop Now',specialOffers:'Special Offers',bestSellers:'Best Sellers',viewAll:'View All',searchProducts:'Search products...',addToCart:'Add to Cart',outOfStock:'Out of Stock',yourCartEmpty:'Your cart is empty',addSomeProducts:'Add some products to get started!',shoppingCart:'Shopping Cart',orderSummary:'Order Summary',subtotal:'Subtotal',priceAfterDiscount:'Price After Discount',courier:'Courier',grandTotal:'Grand Total',proceedCheckout:'Proceed to Checkout',checkout:'Checkout',payment:'Payment',orderPlacedTitle:'Order Placed!',fullName:'Full Name',mobileNumber:'Mobile Number',deliveryAddress:'Delivery Address',savedAddresses:'Saved Addresses',continueToPayment:'Continue to Payment',scanWithAlipay:'Scan with Alipay',scanWithWechat:'Scan with WeChat Pay',uploadProof:'Tap to upload screenshot',paymentUploaded:'Payment proof uploaded!',submitOrder:'Submit Order',thankYou:'Thank You for Your Purchase!',dispatchSoon:'Your order will be dispatched soon!',continueShopping:'Continue Shopping',myProfile:'My Profile',myOrders:'My Orders',customerSupport:'Customer Support',language:'Language',logout:'Logout',login:'Login',register:'Register',alreadyHaveAccount:'Already have an account? Login',noAccountYet:"Don't have an account? Register",email:'Email',password:'Password',mobile:'Mobile',wechat:'WeChat',otp:'OTP Code',sendCode:'Send Code',verifyLogin:'Verify & Login',continueWithWechat:'Continue with WeChat',confirmPassword:'Confirm Password',createAccount:'Create New Account',signUp:'Sign Up',resetPassword:'Reset Password',newPassword:'New Password',enterOtp:'Enter OTP',forgotPassword:'Forgot Password',name:'Name',addAddress:'Add Address',saveAddress:'Save Address',noOrdersYet:'No orders yet',address:'Address',tracking:'Tracking',orAddManually:'Or enter manually:',contactWechat:'Contact Us on WeChat'},
  zh:{home:'首页',shop:'商城',cart:'购物车',me:'我的',shopNow:'立即购买',specialOffers:'特别优惠',bestSellers:'热销商品',viewAll:'查看全部',searchProducts:'搜索商品...',addToCart:'加入购物车',outOfStock:'缺货',yourCartEmpty:'购物车是空的',addSomeProducts:'快去添加商品吧！',shoppingCart:'购物车',orderSummary:'订单摘要',subtotal:'小计',priceAfterDiscount:'折扣后价格',courier:'快递费',grandTotal:'总计',proceedCheckout:'去结算',checkout:'结算',payment:'支付',orderPlacedTitle:'订单已提交！',fullName:'姓名',mobileNumber:'手机号码',deliveryAddress:'收货地址',savedAddresses:'已保存地址',continueToPayment:'继续支付',scanWithAlipay:'使用支付宝扫码',scanWithWechat:'使用微信支付扫码',uploadProof:'点击上传付款截图',paymentUploaded:'付款凭证已上传！',submitOrder:'提交订单',thankYou:'感谢您的购买！',dispatchSoon:'您的订单将很快发货！',continueShopping:'继续购物',myProfile:'我的资料',myOrders:'我的订单',customerSupport:'客户支持',language:'语言',logout:'退出登录',login:'登录',register:'注册',alreadyHaveAccount:'已有账户？登录',noAccountYet:'还没有账户？注册',email:'电子邮箱',password:'密码',mobile:'手机号',wechat:'微信',otp:'验证码',sendCode:'发送验证码',verifyLogin:'验证并登录',continueWithWechat:'使用微信继续',confirmPassword:'确认密码',createAccount:'创建新账户',signUp:'注册',resetPassword:'重置密码',newPassword:'新密码',enterOtp:'输入验证码',forgotPassword:'忘记密码',name:'姓名',addAddress:'添加地址',saveAddress:'保存地址',noOrdersYet:'暂无订单',address:'地址',tracking:'物流跟踪',orAddManually:'或手动输入：',contactWechat:'通过微信联系我们'},
  bn:{home:'হোম',shop:'দোকান',cart:'কার্ট',me:'আমি',shopNow:'এখনই কিনুন',specialOffers:'বিশেষ অফার',bestSellers:'বেস্ট সেলার',viewAll:'সব দেখুন',searchProducts:'পণ্য খুঁজুন...',addToCart:'কার্টে যুক্ত করুন',outOfStock:'স্টক নেই',yourCartEmpty:'আপনার কার্ট খালি',addSomeProducts:'শুরু করতে কিছু পণ্য যুক্ত করুন!',shoppingCart:'শপিং কার্ট',orderSummary:'অর্ডার সামারি',subtotal:'সাবটোটাল',priceAfterDiscount:'ছাড়ের পরে মূল্য',courier:'কুরিয়ার',grandTotal:'সর্বমোট',proceedCheckout:'চেকআউটে যান',checkout:'চেকআউট',payment:'পেমেন্ট',orderPlacedTitle:'অর্ডার সম্পন্ন হয়েছে!',fullName:'পূর্ণ নাম',mobileNumber:'মোবাইল নম্বর',deliveryAddress:'ডেলিভারি ঠিকানা',savedAddresses:'সংরক্ষিত ঠিকানা',continueToPayment:'পেমেন্টে যান',scanWithAlipay:'Alipay দিয়ে স্কান করুন',scanWithWechat:'WeChat Pay দিয়ে স্কান করুন',uploadProof:'স্ক্রিনশট আপলোড করতে ট্যাপ করুন',paymentUploaded:'পেমেন্ট প্রমাণ আপলোড হয়েছে!',submitOrder:'অর্ডার সাবমিট করুন',thankYou:'আপনার ক্রয়ের জন্য ধন্যবাদ!',dispatchSoon:'আপনার অর্ডার শীঘ্রই পাঠানো হবে!',continueShopping:'শপিং চালিয়ে যান',myProfile:'আমার প্রোফাইল',myOrders:'আমার অর্ডার',customerSupport:'কাস্টমার সাপোর্ট',language:'ভাষা',logout:'লগআউট',login:'লগইন',register:'রেজিস্টার',alreadyHaveAccount:'অ্যাকাউন্ট আছে? লগইন করুন',noAccountYet:'অ্যাকাউন্ট নেই? রেজিস্টার করুন',email:'ইমেইল',password:'পাসওয়ার্ড',mobile:'মোবাইল',wechat:'উইচ্যাট',otp:'ওটিপি কোড',sendCode:'কোড পাঠান',verifyLogin:'যাচাই করে লগইন করুন',continueWithWechat:'WeChat দিয়ে চালিয়ে যান',confirmPassword:'পাসওয়ার্ড নিশ্চিত করুন',createAccount:'নতুন অ্যাকাউন্ট তৈরি করুন',signUp:'সাইন আপ',resetPassword:'পাসওয়ার্ড রিসেট করুন',newPassword:'নতুন পাসওয়ার্ড',enterOtp:'ওটিপি লিখুন',forgotPassword:'পাসওয়ার্ড ভুলে গেছেন',name:'নাম',addAddress:'ঠিকানা যুক্ত করুন',saveAddress:'ঠিকানা সংরক্ষণ করুন',noOrdersYet:'এখনো কোনো অর্ডার নেই',address:'ঠিকানা',tracking:'ট্র্যাকিং',orAddManually:'অথবা ম্যানুয়ালি লিখুন:',contactWechat:'WeChat-এ আমাদের সাথে যোগাযোগ করুন'}
};
function useT(lang){ return (k)=> (TR[lang]&&TR[lang][k]) || TR.en[k] || k; }

function openPrintWindow(html){
  const w=window.open('','_blank');
  if(!w){alert('Please allow pop-ups for this site to print or save the PDF.');return;}
  w.document.write(html); w.document.close(); w.focus();
  setTimeout(()=>{try{w.print();}catch(e){}},350);
}
function buildPOHTML({poNum,date,time,vendor,hdr,items,totQty,totC,totS,bdLC,chnLC,grand}){
  const rows=items.map(i=>`<tr><td>${i.name}</td><td style="text-align:center">${i.qty}</td><td style="text-align:center">${i.pw||''}</td><td style="text-align:right">${i.uc||0}</td><td style="text-align:right">${i.tc||0}</td><td style="text-align:right">${i.ts2||0}</td><td style="text-align:center">${i.exp||''}</td></tr>`).join('');
  return `<html><head><title>Purchase Order ${poNum}</title><style>
    body{font-family:Arial,sans-serif;padding:24px;color:#222}
    h2{color:#15532D;margin:0 0 2px}
    table{width:100%;border-collapse:collapse;margin-top:12px}
    th,td{padding:6px 8px;border-bottom:1px solid #ddd;font-size:12px}
    th{text-align:left;background:#E8F5E9}
    .tot{margin-top:14px;width:280px;margin-left:auto;font-size:13px}
    .tot div{display:flex;justify-content:space-between;padding:3px 0}
    .grand{font-weight:bold;font-size:16px;border-top:2px solid #333;color:#15532D}
  </style></head><body>
    <h2>Purchase Order #${poNum}</h2>
    <div>Date: ${date} &nbsp; Time: ${time}</div>
    <div>Vendor: ${vendor||'-'}</div>
    <div>Costing RMB Rate: ${hdr.cr||'-'} &nbsp; Selling RMB Rate: ${hdr.sr||'-'}</div>
    <table><thead><tr><th>Product</th><th>Qty</th><th>Packed(g)</th><th>Unit Cost(BDT)</th><th>Total Cost(BDT)</th><th>Total Ship(BDT)</th><th>Expiry</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="tot">
      <div><span>Total Qty</span><span>${totQty} PCS</span></div>
      <div><span>Total Cost</span><span>৳${totC.toFixed(2)}</span></div>
      <div><span>Total Shipping</span><span>৳${totS.toFixed(2)}</span></div>
      <div><span>BD Local Courier</span><span>৳${bdLC.toFixed(2)}</span></div>
      <div><span>China Local Courier</span><span>৳${chnLC.toFixed(2)}</span></div>
      <div class="grand"><span>Grand Total</span><span>৳${grand.toFixed(2)}</span></div>
    </div>
  </body></html>`;
}
function buildSalesReceiptHTML({orderNo,cname,mob,addr,items,sub,pad,cour,grand,hasDsc}){
  const rows=items.map(i=>`<tr><td>${i.name}</td><td style="text-align:center">${i.qty}</td><td style="text-align:right">¥${(+i.up).toFixed(2)}</td><td style="text-align:right">¥${(+i.tp).toFixed(2)}</td></tr>`).join('');
  return `<html><head><title>Receipt ${orderNo}</title><style>
    body{font-family:Arial,sans-serif;padding:24px;color:#222}
    h2{color:#15532D;margin:0 0 2px}
    table{width:100%;border-collapse:collapse;margin-top:12px}
    th,td{padding:6px 8px;border-bottom:1px solid #ddd;font-size:13px}
    th{text-align:left;background:#E8F5E9}
    .tot{margin-top:14px;width:260px;margin-left:auto;font-size:14px}
    .tot div{display:flex;justify-content:space-between;padding:3px 0}
    .grand{font-weight:bold;font-size:17px;border-top:2px solid #333;color:#15532D}
    .center{text-align:center}
  </style></head><body>
    <h2>Taste of Desh</h2>
    <div>Raa Trade International &middot; Beijing, China &middot; WeChat: RaaTrade</div>
    <div style="margin-top:10px">Order #: <b>${orderNo}</b></div>
    <div>Customer: ${cname||'-'} &nbsp; Mobile: ${mob||'-'}</div>
    <div>Address: ${addr||'-'}</div>
    <table><thead><tr><th>Product</th><th class="center">Qty</th><th>Unit Price</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="tot">
      <div><span>Subtotal</span><span>¥${sub.toFixed(2)}</span></div>
      ${hasDsc?`<div><span>Price After Discount</span><span>¥${pad.toFixed(2)}</span></div>`:''}
      <div><span>Courier</span><span>¥${cour.toFixed(2)}</span></div>
      <div class="grand"><span>Grand Total</span><span>¥${grand.toFixed(2)}</span></div>
    </div>
    <div class="center" style="margin-top:24px;font-style:italic">Thank you for your business</div>
  </body></html>`;
}

function Btn({children,onClick,v='primary',sm=false,style={},disabled=false}) {
  const variants = {
    primary:{bg:G.gm,c:G.w,b:'none'},
    danger:{bg:G.rd,c:G.w,b:'none'},
    info:{bg:G.bd,c:G.w,b:'none'},
    warn:{bg:G.yd,c:G.w,b:'none'},
    outline:{bg:'transparent',c:G.gm,b:`1.5px solid ${G.gm}`},
  };
  const vt = variants[v] || variants.primary;
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background:disabled?G.mut:vt.bg,color:disabled?G.w:vt.c,
      border:vt.b,borderRadius:7,
      padding:sm?'5px 11px':'9px 17px',
      cursor:disabled?'not-allowed':'pointer',
      fontWeight:'bold',fontSize:sm?11:13,
      display:'inline-flex',alignItems:'center',gap:5,
      opacity:disabled?0.6:1,transition:'filter 0.15s',...style
    }}>{children}</button>
  );
}

function FInput({label,value,onChange,placeholder='',type='text',req=false,style={}}) {
  return (
    <div style={{marginBottom:10}}>
      {label && <div style={{fontSize:11,color:G.tx,marginBottom:3,fontWeight:'600'}}>{label}{req&&<span style={{color:G.rd}}> *</span>}</div>}
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} type={type}
        style={{width:'100%',padding:'8px 11px',borderRadius:8,border:`1px solid ${G.brd}`,fontSize:13,boxSizing:'border-box',outline:'none',color:G.dk,background:G.w,...style}}/>
    </div>
  );
}

function FSel({label,value,onChange,options=[]}) {
  return (
    <div style={{marginBottom:10}}>
      {label && <div style={{fontSize:11,color:G.tx,marginBottom:3,fontWeight:'600'}}>{label}</div>}
      <select value={value} onChange={e=>onChange(e.target.value)}
        style={{width:'100%',padding:'8px 11px',borderRadius:8,border:`1px solid ${G.brd}`,fontSize:13,boxSizing:'border-box',background:G.w,color:G.dk}}>
        <option value="" style={{color:G.dk,background:G.w}}>-- Select --</option>
        {options.map(o=><option key={typeof o==='string'?o:o.v} value={typeof o==='string'?o:o.v} style={{color:G.dk,background:G.w}}>{typeof o==='string'?o:o.l}</option>)}
      </select>
    </div>
  );
}

function Overlay({title,onClose,children,width=560}) {
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div style={{background:G.w,borderRadius:14,width:'100%',maxWidth:width,maxHeight:'90vh',overflow:'auto',boxShadow:'0 8px 32px rgba(0,0,0,0.3)'}}>
        <div style={{background:G.gd,color:G.w,padding:'14px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',borderRadius:'14px 14px 0 0'}}>
          <span style={{fontWeight:'bold',fontSize:15}}>{title}</span>
          <button onClick={onClose} style={{background:'none',border:'none',color:G.w,fontSize:22,cursor:'pointer',lineHeight:1}}>✕</button>
        </div>
        <div style={{padding:18}}>{children}</div>
      </div>
    </div>
  );
}

function Card({children,style={}}) {
  return <div style={{background:G.w,borderRadius:12,padding:16,boxShadow:'0 2px 10px rgba(20,40,25,0.06)',border:`1px solid ${G.brd}`,...style}}>{children}</div>;
}

function Stat({icon,label,value,color=G.gm}) {
  return (
    <Card style={{textAlign:'center',padding:'14px 10px'}}>
      <div style={{fontSize:26,marginBottom:4}}>{icon}</div>
      <div style={{fontSize:20,fontWeight:'bold',color}}>{value}</div>
      <div style={{fontSize:11,color:G.tx,marginTop:2}}>{label}</div>
    </Card>
  );
}

function CatChip({cat,catColors}) {
  const c = (catColors && catColors[cat]) || '#757575';
  return <span style={{background:c+'22',color:c,borderRadius:10,padding:'2px 9px',fontSize:11,fontWeight:'bold',whiteSpace:'nowrap'}}>{cat}</span>;
}

// Catches a render crash in any tab and shows the actual error instead of a blank
// black screen — a white page with the message beats silence when something breaks.
class TabErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state={err:null}; }
  static getDerivedStateFromError(err){ return {err}; }
  componentDidCatch(err,info){ console.error('Tab crashed:', err, info); }
  render(){
    if(this.state.err){
      return (
        <div style={{padding:24}}>
          <div style={{background:'#FDECEA',border:'1px solid #E74C3C',borderRadius:10,padding:18,maxWidth:700}}>
            <div style={{fontWeight:'bold',color:'#B71C1C',fontSize:15,marginBottom:8}}>⚠️ This section hit an error</div>
            <div style={{fontSize:13,color:'#333',marginBottom:10}}>The rest of the admin panel still works — switch to another tab, or reload the page. Details below.</div>
            <pre style={{fontSize:11,color:'#7A1C1C',background:'#fff',border:'1px solid #f0c8c8',borderRadius:6,padding:10,overflow:'auto',whiteSpace:'pre-wrap'}}>{String(this.state.err && (this.state.err.stack || this.state.err.message || this.state.err))}</pre>
            <button onClick={()=>this.setState({err:null})} style={{marginTop:10,background:'#15532D',color:'#fff',border:'none',borderRadius:8,padding:'8px 16px',cursor:'pointer',fontSize:13}}>Try again</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function ConfirmDlg({msg,onYes,onNo}) {
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:3000,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:G.w,borderRadius:14,padding:24,maxWidth:420,textAlign:'center',boxShadow:'0 8px 24px rgba(0,0,0,0.2)'}}>
        <div style={{fontSize:36,marginBottom:10}}>⚠️</div>
        {/* pre-line so a confirmation can spell out exactly what it's about to do */}
        <div style={{fontSize:14,color:G.tx,marginBottom:20,lineHeight:1.6,whiteSpace:'pre-line',textAlign:'left'}}>{msg}</div>
        <div style={{display:'flex',gap:10,justifyContent:'center'}}>
          <Btn v='outline' onClick={onNo}>Cancel</Btn>
          <Btn v='danger' onClick={onYes}>Confirm</Btn>
        </div>
      </div>
    </div>
  );
}

function ComboInput({value,onChange,onPick,options,placeholder}) {
  const [open,setOpen]=useState(false);
  const filtered = value ? options.filter(o=>o.name.toLowerCase().includes(value.toLowerCase())).slice(0,7) : [];
  return (
    <div style={{position:'relative'}}>
      <input value={value} onChange={e=>{onChange(e.target.value);setOpen(true);}} onFocus={()=>setOpen(true)} onBlur={()=>setTimeout(()=>setOpen(false),150)} placeholder={placeholder}
        style={{width:'100%',padding:'5px 7px',borderRadius:5,border:`1px solid ${G.brd}`,fontSize:11,boxSizing:'border-box',minWidth:140}}/>
      {open&&filtered.length>0&&(
        <div onMouseDown={e=>e.preventDefault()} style={{position:'absolute',top:'100%',left:0,zIndex:200,background:G.w,border:`1px solid ${G.brd}`,borderRadius:8,boxShadow:'0 4px 14px rgba(0,0,0,0.18)',minWidth:210,maxHeight:200,overflow:'auto'}}>
          {filtered.map(o=>(
            <div key={o.id} onClick={()=>{onPick(o);setOpen(false);}} style={{padding:'7px 10px',cursor:'pointer',fontSize:11,borderBottom:`1px solid ${G.bg}`}}>
              <div style={{fontWeight:'bold'}}>{o.name}</div>
              <div style={{color:G.mut,fontSize:10}}>{o.cat} · {o.pw}g{o.upc?' · '+o.upc:''}</div>
            </div>
          ))}
        </div>
      )}
      {open&&value&&filtered.length===0&&(
        <div onMouseDown={e=>e.preventDefault()} style={{position:'absolute',top:'100%',left:0,zIndex:200,background:G.w,border:`1px solid ${G.brd}`,borderRadius:8,boxShadow:'0 4px 14px rgba(0,0,0,0.18)',minWidth:180,padding:'8px 10px',fontSize:11,color:G.mut}}>
          No matching product
        </div>
      )}
    </div>
  );
}

function CatManageOverlay({cats,setCats,catColors,setCatColors,prods,onClose}) {
  const [nc,setNc]=useState({name:'',color:'#2196F3'});
  const [busy,setBusy]=useState(false);
  // Categories now live in the `categories` table. Previously these edits only
  // changed React state, so every rename or new colour vanished on refresh.
  async function addCat(){
    if(!nc.name||cats.includes(nc.name)) return;
    setBusy(true);
    const { error } = await supabase.from('categories')
      .insert({ name: nc.name, color: nc.color, sort_order: 100 });
    setBusy(false);
    if(error){ alert('Failed to add category: '+error.message); return; }
    setCats(p=>[...p,nc.name]);
    setCatColors(p=>({...p,[nc.name]:nc.color}));
    setNc({name:'',color:'#2196F3'});
  }
  async function delCat(name){
    const inUse = prods.some(p=>p.cat===name);
    if(inUse){ alert(`Cannot delete "${name}" — products still use this category. Reassign or delete those products first.`); return; }
    if(!window.confirm(`Delete the category "${name}"?`)) return;
    setBusy(true);
    const { error } = await supabase.from('categories').delete().eq('name', name);
    setBusy(false);
    if(error){ alert('Failed to delete category: '+error.message); return; }
    setCats(p=>p.filter(c=>c!==name));
    setCatColors(p=>{const n={...p}; delete n[name]; return n;});
  }
  async function updColor(name, color){
    setCatColors(p=>({...p,[name]:color}));   // update the UI straight away
    const { error } = await supabase.from('categories').update({ color }).eq('name', name);
    if(error) alert('Failed to save colour: '+error.message);
  }
  return (
    <Overlay title="Manage Categories" onClose={onClose} width={460}>
      {cats.map(c=>(
        <div key={c} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 0',borderBottom:`1px solid ${G.brd}`}}>
          <input type="color" value={catColors[c]||'#999999'} onChange={e=>updColor(c, e.target.value)}
            title="Change colour" style={{width:26,height:26,padding:0,borderRadius:5,border:`1px solid ${G.brd}`,cursor:'pointer',flexShrink:0,background:'none'}}/>
          <div style={{flex:1,fontSize:13,fontWeight:'bold',color:G.dk}}>{c}</div>
          <div style={{fontSize:11,color:G.mut}}>{prods.filter(p=>p.cat===c).length} items</div>
          <button onClick={()=>delCat(c)} disabled={busy} style={{background:'none',border:'none',color:G.rd,cursor:busy?'not-allowed':'pointer',fontSize:15}}>🗑️</button>
        </div>
      ))}
      {cats.length===0&&<div style={{color:G.mut,fontSize:12,padding:'10px 0'}}>No categories yet.</div>}
      <div style={{marginTop:16,paddingTop:14,borderTop:`2px dashed ${G.brd}`}}>
        <div style={{fontWeight:'bold',fontSize:12,marginBottom:8,color:G.dk}}>+ Add New Category</div>
        <div style={{display:'flex',gap:8,alignItems:'flex-end'}}>
          <div style={{flex:1}}><FInput label="Name" value={nc.name} onChange={v=>setNc(p=>({...p,name:v}))}/></div>
          <div><div style={{fontSize:11,marginBottom:3,fontWeight:'600'}}>Color</div><input type="color" value={nc.color} onChange={e=>setNc(p=>({...p,color:e.target.value}))} style={{width:50,height:36,borderRadius:7,border:`1px solid ${G.brd}`,cursor:'pointer'}}/></div>
          <Btn onClick={addCat} disabled={busy}>Add</Btn>
        </div>
      </div>
    </Overlay>
  );
}

function PCard({p,addToCart}) {
  const [added,setAdded] = useState(false);
  const price = ep(p);
  function handleAdd(){addToCart(p);setAdded(true);setTimeout(()=>setAdded(false),1200);}
  return (
    <div style={{background:G.w,borderRadius:14,padding:14,boxShadow:'0 2px 8px rgba(20,40,25,0.07)',border:`1px solid ${G.brd}`,display:'flex',flexDirection:'column',position:'relative'}}>
      {p.isNew&&<span style={{position:'absolute',top:10,left:10,background:G.bd,color:G.w,borderRadius:6,padding:'2px 7px',fontSize:9,fontWeight:'bold'}}>NEW</span>}
      {p.img
        ? <div style={{width:'100%',height:126,borderRadius:10,marginBottom:8,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
            <img src={p.img} alt={p.name} loading="lazy" decoding="async" style={{maxWidth:'100%',maxHeight:'100%',width:'auto',height:'auto',objectFit:'contain',display:'block'}}/>
          </div>
        : <div style={{fontSize:50,textAlign:'center',marginBottom:8,height:126,display:'flex',alignItems:'center',justifyContent:'center'}}>{ICONS[p.cat]||'📦'}</div>
      }
      <span style={{background:G.bg2,color:G.tx,borderRadius:8,padding:'2px 8px',fontSize:10,fontWeight:'bold',alignSelf:'flex-start',marginBottom:6}}>{p.cat}</span>
      <div style={{fontSize:12,fontWeight:'bold',color:G.dk,marginBottom:4,lineHeight:1.35,flex:1}}>{p.name}</div>
      <div style={{fontSize:11,color:G.mut,marginBottom:8}}>{p.pw}g · {p.unit}</div>
      {p.offer && <div style={{fontSize:11,textDecoration:'line-through',color:G.mut}}>¥{p.sp}</div>}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
        <span style={{color:p.offer?G.rd:G.gd,fontWeight:'bold',fontSize:16}}>¥{price.toFixed(2)}</span>
        {p.offer && <span style={{background:G.rl,color:G.rd,borderRadius:5,padding:'2px 7px',fontSize:10,fontWeight:'bold'}}>-{p.disc}%</span>}
      </div>
      {p.stock===0
        ? <div style={{textAlign:'center',color:G.mut,fontSize:12,padding:6,background:G.bg,borderRadius:8}}>Out of Stock</div>
        : <button onClick={handleAdd} style={{width:'100%',background:added?G.g:G.gd,color:G.w,border:'none',borderRadius:9,padding:8,cursor:'pointer',fontSize:12,fontWeight:'bold',transition:'background 0.3s'}}>{added?'✓ Added!':'+ Add to Cart'}</button>
      }
    </div>
  );
}

function Slideshow({slides,addToCart}) {
  const [idx,setIdx]=useState(0);
  useEffect(()=>{
    if(slides.length<2) return;
    const t=setInterval(()=>setIdx(i=>(i+1)%slides.length),4200);
    return ()=>clearInterval(t);
  },[slides.length]);
  if(slides.length===0) return null;
  const s=slides[Math.min(idx,slides.length-1)];
  const bgMap={offer:`linear-gradient(135deg,#B71C1C,#E53935)`,fresh:`linear-gradient(135deg,#0D47A1,#1E88E5)`,best:G.grad,custom:'#1E241F'};
  const tagMap={offer:'🔥 Limited Offer',fresh:'✨ New Arrival',best:'⭐ Best Seller',custom:'📣 Promotion'};
  return (
    <div style={{position:'relative',borderRadius:18,overflow:'hidden',margin:'14px 16px 18px',height:172,background:bgMap[s.kind],color:'#fff',boxShadow:'0 6px 18px rgba(0,0,0,0.18)'}}>
      {s.kind==='custom' ? (
        <>
          {/* blurred, zoomed copy fills the box so any aspect ratio looks intentional */}
          <img src={s.img} aria-hidden="true" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',filter:'blur(18px) brightness(0.6)',transform:'scale(1.15)'}}/>
          {/* the real image, never cropped */}
          <img src={s.img} alt={s.caption||'Promotion'} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'contain'}}/>
          <div style={{position:'absolute',inset:0,background:'linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0) 60%)'}}/>
          {s.caption&&<div style={{position:'absolute',bottom:14,left:18,right:18,fontWeight:'bold',fontSize:15,textShadow:'0 1px 5px rgba(0,0,0,0.7)'}}>{s.caption}</div>}
        </>
      ) : (
        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',padding:'0 18px',gap:14}}>
          {/* No plate behind a real photo — with the backdrop stripped out, the product
              sits directly on the gradient. drop-shadow (not box-shadow) follows the
              alpha channel, so it traces the product's outline rather than a square. */}
          <div style={{flexShrink:0,width:98,height:98,borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',background:s.product.img?'transparent':'rgba(255,255,255,0.18)'}}>
            {s.product.img
              ? <img src={s.product.img} alt={s.product.name} style={{width:'100%',height:'100%',objectFit:'contain',filter:'drop-shadow(0 3px 8px rgba(0,0,0,0.35))'}}/>
              : <span style={{fontSize:46}}>{ICONS[s.product.cat]||'📦'}</span>}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{background:'rgba(255,255,255,0.22)',display:'inline-block',borderRadius:8,padding:'2px 9px',fontSize:11,fontWeight:'bold',marginBottom:6}}>{tagMap[s.kind]}</div>
            <div style={{fontWeight:'bold',fontSize:15,marginBottom:4,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{s.product.name}</div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              {s.product.offer&&<span style={{textDecoration:'line-through',opacity:0.7,fontSize:12}}>¥{s.product.sp}</span>}
              <span style={{fontWeight:'bold',fontSize:18,color:'#FFD54F'}}>¥{ep(s.product).toFixed(2)}</span>
            </div>
          </div>
          <button onClick={()=>addToCart(s.product)} style={{background:'#FFD54F',color:G.gd,border:'none',borderRadius:20,padding:'8px 16px',fontWeight:'bold',fontSize:12,cursor:'pointer',flexShrink:0}}>+ Add</button>
        </div>
      )}
      <div style={{position:'absolute',bottom:9,left:0,right:0,display:'flex',justifyContent:'center',gap:5}}>
        {slides.map((_,i)=>(<div key={i} onClick={()=>setIdx(i)} style={{width:i===idx?16:6,height:6,borderRadius:3,background:i===idx?'#FFD54F':'rgba(255,255,255,0.5)',cursor:'pointer',transition:'width 0.25s'}}/>))}
      </div>
      {slides.length>1&&(
        <>
          <button onClick={()=>setIdx(i=>(i-1+slides.length)%slides.length)} style={{position:'absolute',left:6,top:'50%',transform:'translateY(-50%)',background:'rgba(0,0,0,0.25)',border:'none',color:'#fff',borderRadius:'50%',width:26,height:26,cursor:'pointer',fontSize:15}}>‹</button>
          <button onClick={()=>setIdx(i=>(i+1)%slides.length)} style={{position:'absolute',right:6,top:'50%',transform:'translateY(-50%)',background:'rgba(0,0,0,0.25)',border:'none',color:'#fff',borderRadius:'50%',width:26,height:26,cursor:'pointer',fontSize:15}}>›</button>
        </>
      )}
    </div>
  );
}

function HomeTab({products,categories,addToCart,setTab,t,customSlides}) {
  const bs = products.filter(p=>p.bs&&p.stock>0);
  const offers = products.filter(p=>p.offer&&p.stock>0);
  const slides = useMemo(()=>{
    const cS=(customSlides||[]).map(c=>({kind:'custom',img:c.img,caption:c.caption}));
    const oS=offers.slice(0,3).map(p=>({kind:'offer',product:p}));
    const nS=products.filter(p=>p.isNew&&p.stock>0).slice(0,2).map(p=>({kind:'fresh',product:p}));
    const bS=bs.slice(0,3).map(p=>({kind:'best',product:p}));
    return [...cS,...oS,...nS,...bS];
  },[products,customSlides]);
  return (
    <div>
      <div style={{lineHeight:0}}>
        <img src={BANNER_SHOPNOW} alt="Taste of Desh - A Heart of Bangladesh in China" style={{width:'100%',height:'auto',display:'block'}}/>
      </div>
      <div style={{background:'#1B7D3F',padding:'14px 20px 20px',textAlign:'center'}}>
        <button onClick={()=>setTab('categories')} style={{background:'#FAE646',color:G.gd,border:'none',borderRadius:22,padding:'10px 28px',fontWeight:'bold',fontSize:14,cursor:'pointer'}}>🛒 {t('shopNow')}</button>
      </div>
      <Slideshow slides={slides} addToCart={addToCart}/>
      <div style={{padding:'0 16px 16px',display:'flex',gap:8,overflowX:'auto'}}>
        {categories.map(c=>(
          <div key={c} onClick={()=>setTab('categories')} style={{flexShrink:0,background:G.w,color:G.tx,borderRadius:20,padding:'7px 15px',fontSize:12,fontWeight:'bold',cursor:'pointer',whiteSpace:'nowrap',border:`1px solid ${G.brd}`}}>{c}</div>
        ))}
      </div>
      {offers.length>0&&(
        <div style={{padding:'4px 16px 16px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <div style={{fontSize:15,fontWeight:'bold',color:G.dk}}>🔥 {t('specialOffers')}</div>
            <div style={{color:G.g,fontSize:12,cursor:'pointer',fontWeight:'bold'}} onClick={()=>setTab('categories')}>{t('viewAll')} →</div>
          </div>
          <div style={{display:'flex',gap:12,overflowX:'auto',paddingBottom:8}}>
            {offers.map(p=><div key={p.id} style={{flexShrink:0,width:150}}><PCard p={p} addToCart={addToCart}/></div>)}
          </div>
        </div>
      )}
      <div style={{padding:'4px 16px 16px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
          <div style={{fontSize:15,fontWeight:'bold',color:G.dk}}>⭐ {t('bestSellers')}</div>
          <div style={{color:G.g,fontSize:12,cursor:'pointer',fontWeight:'bold'}} onClick={()=>setTab('categories')}>{t('viewAll')} →</div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          {bs.map(p=><PCard key={p.id} p={p} addToCart={addToCart}/>)}
        </div>
      </div>
    </div>
  );
}

function CatTab({products,categories,addToCart,t}) {
  const [active,setActive] = useState('All');
  const [q,setQ] = useState('');
  const allCats = ['All','Best Sellers','Offers',...categories];
  const list = useMemo(()=>{
    let r = products;
    if(active==='Best Sellers') r=products.filter(p=>p.bs);
    else if(active==='Offers') r=products.filter(p=>p.offer);
    else if(active!=='All') r=products.filter(p=>p.cat===active);
    if(q) r=r.filter(p=>p.name.toLowerCase().includes(q.toLowerCase()));
    return r;
  },[products,active,q]);
  return (
    <div>
      <div style={{padding:'10px 16px',background:G.w,borderBottom:`1px solid ${G.brd}`}}>
        <div style={{display:'flex',alignItems:'center',background:G.bg,borderRadius:10,padding:'7px 13px',gap:7}}>
          <span>🔍</span>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder={t('searchProducts')} style={{border:'none',background:'none',outline:'none',flex:1,fontSize:13}}/>
          {q&&<button onClick={()=>setQ('')} style={{background:'none',border:'none',cursor:'pointer',color:G.mut,fontSize:16}}>✕</button>}
        </div>
      </div>
      <div style={{padding:'10px 16px',display:'flex',gap:8,overflowX:'auto',borderBottom:`1px solid ${G.brd}`}}>
        {allCats.map(c=>{
          const isA=active===c;
          return(
            <button key={c} onClick={()=>setActive(c)} style={{flexShrink:0,padding:'7px 14px',borderRadius:20,border:isA?'none':`1px solid ${G.brd}`,cursor:'pointer',fontWeight:'bold',fontSize:11,background:isA?G.gm:G.w,color:isA?G.w:G.tx}}>
              {c==='Best Sellers'?'⭐ '+c:c==='Offers'?'🔥 '+c:c}
            </button>
          );
        })}
      </div>
      <div style={{padding:'16px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        {list.length===0
          ? <div style={{gridColumn:'1/-1',textAlign:'center',padding:40,color:G.mut}}>No products found</div>
          : list.map(p=><PCard key={p.id} p={p} addToCart={addToCart}/>)
        }
      </div>
    </div>
  );
}

function CartTab({cart,prods,rawTotal,discTotal,hasDsc,totalGW,courierFee,grandTotal,upd,rm,setCO,t,auth,onRequireLogin}) {
  if(cart.length===0) return(
    <div style={{textAlign:'center',padding:'60px 20px',color:G.mut}}>
      <div style={{fontSize:64,marginBottom:16}}>🛒</div>
      <div style={{fontSize:18,fontWeight:'bold',marginBottom:8}}>{t('yourCartEmpty')}</div>
      <div style={{fontSize:13}}>{t('addSomeProducts')}</div>
    </div>
  );
  return(
    <div style={{padding:16}}>
      <div style={{fontSize:16,fontWeight:'bold',color:G.dk,marginBottom:14}}>{t('shoppingCart')} ({cart.length})</div>
      {cart.map(item=>{
        const price=ep(item);
        // live stock from the product list, not the snapshot taken when it was added
        const liveProd=prods?.find(p=>p.id===item.id);
        const maxQty=liveProd?liveProd.stock:(item.stock||0);
        const atMax=item.qty>=maxQty;
        return(
          <div key={item.id} style={{background:G.w,borderRadius:14,padding:14,marginBottom:10,boxShadow:'0 2px 6px rgba(20,40,25,0.06)',display:'flex',gap:12,alignItems:'flex-start'}}>
            {item.img
              ? <div style={{width:60,height:60,flexShrink:0,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
                  <img src={item.img} alt={item.name} loading="lazy" decoding="async" style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain',display:'block'}}/>
                </div>
              : <div style={{fontSize:38,flexShrink:0}}>{ICONS[item.cat]||'📦'}</div>}
            <div style={{flex:1}}>
              <div style={{fontWeight:'bold',fontSize:12,color:G.dk,marginBottom:2}}>
                {item.name}
                {item.offer&&<span style={{marginLeft:5,background:G.rl,color:G.rd,borderRadius:4,padding:'1px 5px',fontSize:10,fontWeight:'bold'}}>-{item.disc}%</span>}
              </div>
              <div style={{fontSize:11,color:G.mut,marginBottom:6}}>{item.pw}g</div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div>
                  {item.offer&&<div style={{fontSize:10,textDecoration:'line-through',color:G.mut}}>¥{item.sp} each</div>}
                  <div style={{color:G.gd,fontWeight:'bold',fontSize:14}}>¥{(price*item.qty).toFixed(2)}</div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <button onClick={()=>upd(item.id,item.qty-1)} style={{width:26,height:26,borderRadius:'50%',border:`1px solid ${G.brd}`,background:G.w,cursor:'pointer',fontSize:15,display:'flex',alignItems:'center',justifyContent:'center'}}>−</button>
                  <span style={{fontWeight:'bold',minWidth:18,textAlign:'center'}}>{item.qty}</span>
                  <button onClick={()=>upd(item.id,item.qty+1)} disabled={atMax} title={atMax?`Only ${maxQty} in stock`:''} style={{width:26,height:26,borderRadius:'50%',border:'none',background:atMax?G.mut:G.gd,color:G.w,cursor:atMax?'not-allowed':'pointer',fontSize:15,display:'flex',alignItems:'center',justifyContent:'center',opacity:atMax?0.6:1}}>+</button>
                </div>
              </div>
              {atMax&&<div style={{fontSize:10,color:G.yd,marginTop:5,fontWeight:'bold'}}>⚠️ Only {maxQty} left in stock</div>}
              {item.qty>maxQty&&<div style={{fontSize:10,color:G.rd,marginTop:5,fontWeight:'bold'}}>⚠️ Only {maxQty} available — quantity will be reduced</div>}
            </div>
            <button onClick={()=>rm(item.id)} style={{background:'none',border:'none',cursor:'pointer',color:G.mut,fontSize:16,flexShrink:0}}>🗑️</button>
          </div>
        );
      })}
      <Card style={{marginTop:8}}>
        <div style={{fontWeight:'bold',fontSize:14,marginBottom:10}}>{t('orderSummary')}</div>
        {hasDsc&&<div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}><span style={{color:G.mut,textDecoration:'line-through'}}>{t('subtotal')}</span><span style={{color:G.mut,textDecoration:'line-through'}}>¥{rawTotal.toFixed(2)}</span></div>}
        {hasDsc&&<div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4,color:G.gd,fontWeight:'bold'}}><span>{t('priceAfterDiscount')}</span><span>¥{discTotal.toFixed(2)}</span></div>}
        {!hasDsc&&<div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}><span>{t('subtotal')}</span><span>¥{rawTotal.toFixed(2)}</span></div>}
        <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}><span style={{color:G.tx}}>{t('courier')} ({totalGW.toFixed(2)} kg)</span><span>¥{courierFee.toFixed(2)}</span></div>
        <div style={{borderTop:`1px solid ${G.brd}`,marginTop:8,paddingTop:8,display:'flex',justifyContent:'space-between',fontWeight:'bold',fontSize:16}}>
          <span>{t('grandTotal')}</span><span style={{color:G.gd}}>¥{grandTotal.toFixed(2)}</span>
        </div>
      </Card>
      {/* Fix 3: logged-out customers are sent to login first, then bounced back to checkout */}
      <button onClick={()=>{ if(auth?.loggedIn) setCO('info'); else onRequireLogin(); }}
        style={{width:'100%',background:auth?.loggedIn?G.gd:G.gm,color:G.w,border:'none',borderRadius:14,padding:15,cursor:'pointer',fontSize:15,fontWeight:'bold',marginTop:14,boxShadow:'0 3px 10px rgba(0,0,0,0.2)'}}>
        {auth?.loggedIn ? `${t('proceedCheckout')} →` : `🔒 ${t('login')} to ${t('checkout')}`}
      </button>
      {!auth?.loggedIn&&<div style={{textAlign:'center',fontSize:11,color:G.mut,marginTop:8}}>Your cart will be kept while you sign in.</div>}
    </div>
  );
}

// Show a stored date (ISO 'YYYY-MM-DD', or anything Date can parse) as DD/MM/YYYY.
// The date PICKER itself always follows the device's locale — that's set by the
// operating system and a website can't override it — but everywhere we DISPLAY a
// date we can use the day/month/year order.
function ddmmyyyy(v){
  if(!v) return '';
  const d = new Date(v);
  if(isNaN(d)) return v;
  const p = (x)=>String(x).padStart(2,'0');
  return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()}`;
}

// A checkerboard, so a transparent image reads as transparent in a preview
// instead of looking like it has a white background.
const CHECKER = {
  backgroundColor:'#FFFFFF',
  backgroundImage:'linear-gradient(45deg,#E4E7E4 25%,transparent 25%),linear-gradient(-45deg,#E4E7E4 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#E4E7E4 75%),linear-gradient(-45deg,transparent 75%,#E4E7E4 75%)',
  backgroundSize:'12px 12px',
  backgroundPosition:'0 0,0 6px,6px -6px,-6px 0px',
};

// ==================== Background removal ====================
// Product photos are almost always shot on a plain white backdrop. That white is
// baked into the JPEG, so the picture shows up as a white rectangle whenever it
// sits on a coloured surface (like the blue slideshow card).
//
// This strips it out: it samples the four corners to learn the backdrop colour,
// then flood-fills INWARD from the edges, turning every matching pixel that is
// *connected to the border* transparent. White pixels inside the product — text on
// the packet, a white label — are kept, because they aren't reachable from the edge.
//
// Finally it crops away the empty margin, which is what makes the product look
// bigger: it fills its card instead of floating in a sea of blank space.
//
// Returns { file, removed }. If the photo has no clean backdrop, it hands the
// original straight back rather than destroying it.
async function removeBackground(file, tolerance = 34) {
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload  = () => res(i);
    i.onerror = () => rej(new Error('That image could not be read.'));
    i.src = URL.createObjectURL(file);
  });

  const MAX = 900;   // keeps the resulting PNG a sensible size
  const scale = Math.min(1, MAX / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width  * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const cv  = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  URL.revokeObjectURL(img.src);

  const id = ctx.getImageData(0, 0, w, h);
  const d  = id.data;

  // What colour IS the backdrop? Average the four corners.
  let br = 0, bg = 0, bb = 0;
  [[0,0], [w-1,0], [0,h-1], [w-1,h-1]].forEach(([x,y]) => {
    const k = (y*w + x) * 4;
    br += d[k]; bg += d[k+1]; bb += d[k+2];
  });
  br /= 4; bg /= 4; bb /= 4;

  const near = (px) => {
    const k = px * 4;
    return Math.abs(d[k]   - br) <= tolerance
        && Math.abs(d[k+1] - bg) <= tolerance
        && Math.abs(d[k+2] - bb) <= tolerance;
  };

  // Flood fill inward from every border pixel.
  const visited = new Uint8Array(w * h);
  const stack   = new Int32Array(w * h);
  let sp = 0;
  const push = (px) => { if (!visited[px]) { visited[px] = 1; stack[sp++] = px; } };

  for (let x = 0; x < w; x++) { push(x); push((h-1)*w + x); }
  for (let y = 0; y < h; y++) { push(y*w); push(y*w + w - 1); }

  let cleared = 0;
  while (sp > 0) {
    const px = stack[--sp];
    if (!near(px)) continue;          // hit the product — stop, don't expand through it
    d[px*4 + 3] = 0;
    cleared++;
    const x = px % w, y = (px - x) / w;
    if (x > 0)     push(px - 1);
    if (x < w - 1) push(px + 1);
    if (y > 0)     push(px - w);
    if (y < h - 1) push(px + w);
  }

  // Almost everything vanished? Then there was no backdrop to speak of —
  // it's a photo with a busy background. Leave the original alone.
  if (cleared > 0.92 * w * h || cleared < 0.02 * w * h) {
    return { file, removed: false };
  }

  // Soften the cut edge so it doesn't look snipped out with scissors.
  const snap = new Uint8ClampedArray(w * h);
  for (let i = 0; i < w*h; i++) snap[i] = d[i*4 + 3];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = y*w + x;
      if (snap[px] === 0) continue;
      let sum = 0, cnt = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          sum += snap[ny*w + nx]; cnt++;
        }
      }
      d[px*4 + 3] = Math.round(sum / cnt);
    }
  }
  ctx.putImageData(id, 0, 0);

  // Crop to what's actually left, so the product fills the frame.
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y*w + x)*4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) return { file, removed: false };

  const cw  = maxX - minX + 1;
  const ch  = maxY - minY + 1;
  const pad = Math.round(Math.max(cw, ch) * 0.03);

  const out = document.createElement('canvas');
  out.width  = cw + pad*2;
  out.height = ch + pad*2;
  out.getContext('2d').drawImage(cv, minX, minY, cw, ch, pad, pad, cw, ch);

  const blob = await new Promise(res => out.toBlob(res, 'image/png'));
  if (!blob) return { file, removed: false };

  const base = (file.name || 'product').replace(/\.[^.]+$/, '');
  return { file: new File([blob], base + '.png', { type: 'image/png' }), removed: true };
}

// ==================== Supabase Storage upload helper ====================
// Uploads a File to a public Storage bucket and returns its public URL.
// This is what replaces storing base64 image data inside the database —
// base64 made every product row enormous and slowed down every page load.
async function uploadToBucket(bucket, file, folder='') {
  if(!file) return '';
  if(!file.type || !file.type.startsWith('image/')) throw new Error('Please choose an image file (JPG or PNG).');
  if(file.size > 5*1024*1024) throw new Error('That image is larger than 5MB. Please choose a smaller one.');
  const ext = ((file.name || '').split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g,'') || 'jpg';
  const path = `${folder ? folder + '/' : ''}${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
  const { error } = await supabase.storage.from(bucket)
    .upload(path, file, { cacheControl:'3600', upsert:false, contentType:file.type });
  if(error) throw new Error('Upload failed: ' + error.message);
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// Fetch the profiles row (role, full_name, etc.) for a logged-in user.
// Used after every successful auth action so `auth.user.role` is always fresh.
async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, full_name, mobile, email')
    .eq('id', userId)
    .single();
  if (error) { console.error('fetchProfile error:', error); return null; }
  return data;
}

// ==================== Stage 4: Supabase <-> UI field mapping helpers ====================
// Products
function fromDbProduct(row) {
  return {
    id: row.id, name: row.name, upc: row.upc || '', cat: row.category,
    unit: row.unit || 'PCS', pw: row.pack_weight, gw: row.gross_weight,
    sp: row.selling_price, cp: row.cost_price || 0, stock: row.stock || 0,
    disc: row.discount || 0, offer: !!row.on_offer, bs: !!row.best_seller,
    isNew: !!row.is_new, img: row.image_url || '',
  };
}
function toDbProduct(p) {
  return {
    name: p.name, upc: p.upc || null, category: p.cat, unit: p.unit || 'PCS',
    pack_weight: p.pw, gross_weight: p.gw, selling_price: p.sp, cost_price: p.cp || 0,
    stock: p.stock || 0, discount: p.disc || 0, on_offer: !!p.offer,
    best_seller: !!p.bs, is_new: !!p.isNew, image_url: p.img || null,
  };
}
// Inventory
function fromDbInv(row) {
  return {
    id: row.id, date: row.date, ts: row.time || '', name: row.name,
    cat: row.category || '', qty: row.qty, exp: row.expiry_date,
    sp: row.selling_price || 0, cp: row.cost_price || 0, pw: row.pack_weight || 0,
    upc: row.upc || '',
  };
}
function toDbInv(item, productId) {
  return {
    product_id: productId || null, date: item.date, time: item.ts, name: item.name,
    category: item.cat, qty: item.qty, expiry_date: item.exp,
    selling_price: item.sp, cost_price: item.cp, pack_weight: item.pw, upc: item.upc,
  };
}
// Pick the product an inventory batch belongs to. Two products can share a name
// but differ by pack size (e.g. Black Tea Leaf-Mirzapur 100g vs 200g, or
// Cumin Powder 50g vs 100g), so a name-only match can link a batch to the wrong
// variant and leave the other one reading as out of stock. Match on name + pack
// weight first, then name + UPC, and only fall back to name alone when it's
// unambiguous. Never guesses when a name is duplicated and nothing disambiguates.
function findProductForBatch(prods, batch){
  const name=(batch.name||'').trim();
  const pw=+batch.pw||0;
  const upc=(batch.upc||'').trim();
  const byName=(prods||[]).filter(p=>p.name===name);
  if(byName.length===0) return null;
  if(byName.length===1) return byName[0];              // unique name: done
  const byPw=byName.filter(p=>(+p.pw||0)===pw);
  if(byPw.length===1) return byPw[0];                  // name + pack weight
  if(upc){
    const byUpc=byName.filter(p=>(p.upc||'').trim()===upc);
    if(byUpc.length===1) return byUpc[0];              // name + UPC
    const byBoth=byPw.filter(p=>(p.upc||'').trim()===upc);
    if(byBoth.length===1) return byBoth[0];            // name + pack weight + UPC
  }
  return null;                                         // still ambiguous: don't guess
}
// Sales (+ sale_items)
function fromDbSale(row, items) {
  return {
    id: row.id, seq: row.seq, date: row.date, type: row.type, oid: row.order_id,
    cname: row.customer_name, mob: row.mobile, addr: row.address,
    items: items.map(it => ({ pid: it.product_id || null, name: it.name, qty: it.qty, up: it.unit_price, tp: it.total_price })),
    sub: row.subtotal, disc: row.discount, discTotal: row.discount_total,
    courier: row.courier_fee, grand: row.grand_total,
  };
}
function toDbSale(sale) {
  return {
    seq: sale.seq, date: sale.date, type: sale.type, order_id: sale.oid,
    customer_name: sale.cname, mobile: sale.mob, address: sale.addr,
    subtotal: sale.sub, discount: sale.disc, discount_total: sale.discTotal,
    courier_fee: sale.courier, grand_total: sale.grand,
  };
}
// Online orders (+ order_items) — admin reads/updates only, customer checkout writes these (Stage 5)
function fromDbOrder(row, items) {
  return {
    id: row.id, date: row.date, time: row.time, cname: row.customer_name,
    mob: row.mobile, addr: row.address, status: row.status, tracking: row.tracking || [],
    custCourier: row.customer_courier_fee, discTotal: row.discount_total,
    userId: row.customer_id || null,           // who placed it (RLS ownership column)
    proofUrl: row.payment_proof_url || '',     // uploaded payment screenshot
    payMethod: row.payment_method || '',       // 'alipay' | 'wechat'
    paid: !!row.paid, notes: row.notes || '',
    items: items.map(it => ({ pid: it.product_id, name: it.name, qty: it.qty, up: it.unit_price, gw: it.gross_weight, disc: it.discount || 0 })),
  };
}
// Purchase orders — header + line items stored as jsonb (mirrors the existing `tracking jsonb` pattern)
function fromDbPO(row) {
  return {
    id: row.id, poNum: row.po_num, date: row.date, time: row.time, vendor: row.vendor || '',
    hdr: row.hdr || { cr: '', sr: '', bdc: '', cnc: '' }, items: row.items || [],
    totQty: row.tot_qty, totC: row.tot_c, totS: row.tot_s, bdLC: row.bd_lc, chnLC: row.chn_lc, grand: row.grand,
  };
}
function toDbPO(po) {
  return {
    po_num: po.poNum, date: po.date, time: po.time, vendor: po.vendor, hdr: po.hdr, items: po.items,
    tot_qty: po.totQty, tot_c: po.totC, tot_s: po.totS, bd_lc: po.bdLC, chn_lc: po.chnLC, grand: po.grand,
  };
}

function AuthScreen({onLogin,t}) {
  const [mode,setMode]=useState('login'); // 'login' | 'register' | 'reset'
  const [form,setForm]=useState({email:'',password:'',name:'',confirm:'',newPassword:'',newConfirm:'',otp:''});
  const [otpSent,setOtpSent]=useState(false);
  const [otpCooldown,setOtpCooldown]=useState(0);
  const [busy,setBusy]=useState(false);

  function set(f,v){setForm(p=>({...p,[f]:v}));}

  useEffect(()=>{
    if(otpCooldown<=0) return;
    const id=setInterval(()=>setOtpCooldown(c=>c>0?c-1:0),1000);
    return ()=>clearInterval(id);
  },[otpCooldown>0]);

  function switchMode(m){
    setMode(m);
    setOtpSent(false);setOtpCooldown(0);
    setForm(p=>({...p,otp:''}));
  }

  // Completes login: fetches the profiles row and hands the merged
  // user object up to App.jsx via onLogin().
  async function completeLogin(userId, fallbackEmail){
    // BUG FIX: `profile` was used here but never defined, which threw a
    // ReferenceError and meant onLogin() never ran — that's why you had to
    // refresh the page after logging in.
    const profile = await fetchProfile(userId);
    onLogin({
      id: userId,
      name: profile?.full_name || fallbackEmail?.split('@')[0] || 'Customer',
      mobile: profile?.mobile || '',
      email: profile?.email || fallbackEmail || '',
      role: profile?.role || 'customer',
    });
  }

  // "Send Code" button. Behaves differently depending on mode:
  // - register: creates the (unconfirmed) auth user now, which triggers the signup OTP email
  // - reset: triggers the password-recovery OTP email for an existing user
  async function sendOtp(){
    if(!form.email){alert('Enter your email first');return;}
    setBusy(true);
    try{
      if(mode==='register'){
        if(!form.name||!form.password){alert('Please fill in name and password first');setBusy(false);return;}
        if(form.password!==form.confirm){alert('Passwords do not match');setBusy(false);return;}
        const { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { full_name: form.name } },
        });
        if(error){alert(error.message);setBusy(false);return;}
      } else if(mode==='reset'){
        const { error } = await supabase.auth.resetPasswordForEmail(form.email);
        if(error){alert(error.message);setBusy(false);return;}
      }
      setOtpSent(true);setOtpCooldown(60);
      alert(`Verification code sent to ${form.email}`);
    } finally {
      setBusy(false);
    }
  }

  async function doLogin(){
    if(!form.email||!form.password){alert('Enter email and password');return;}
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: form.email, password: form.password,
    });
    setBusy(false);
    if(error){alert(error.message);return;}
    await completeLogin(data.user.id, data.user.email);
  }

  async function doRegister(){
    if(!form.name||!form.email||!form.password){alert('Please fill in name, email and password');return;}
    if(form.password!==form.confirm){alert('Passwords do not match');return;}
    if(!otpSent||!form.otp){alert('Please request and enter your verification code');return;}
    setBusy(true);
    const { data, error } = await supabase.auth.verifyOtp({
      email: form.email, token: form.otp, type: 'signup',
    });
    setBusy(false);
    if(error){alert(error.message);return;}
    await completeLogin(data.user.id, data.user.email);
  }

  async function doReset(){
    if(!form.email||!form.newPassword){alert('Please fill in your email and new password');return;}
    if(form.newPassword!==form.newConfirm){alert('Passwords do not match');return;}
    if(!otpSent||!form.otp){alert('Please request and enter your verification code');return;}
    setBusy(true);
    const { data, error } = await supabase.auth.verifyOtp({
      email: form.email, token: form.otp, type: 'recovery',
    });
    if(error){setBusy(false);alert(error.message);return;}
    const { error: updErr } = await supabase.auth.updateUser({ password: form.newPassword });
    setBusy(false);
    if(updErr){alert(updErr.message);return;}
    await completeLogin(data.user.id, data.user.email);
  }

  const C = {dark:'#0d522c', btn:'#3c7962', pill:'#77bba2', gold:'#f4ca44'};
  const pillIn={width:'100%',padding:'14px 20px',borderRadius:30,border:'none',background:C.pill,color:C.dark,fontSize:14,boxSizing:'border-box',outline:'none',marginBottom:12,fontWeight:600};
  const fieldLabel={fontSize:12,fontWeight:700,color:C.dark,marginBottom:6,marginLeft:8};
  const pillBtn={width:'100%',padding:'15px 20px',borderRadius:30,border:'none',background:busy?'#8FAE9E':C.btn,color:'#fff',fontSize:16,fontWeight:'bold',cursor:busy?'default':'pointer',marginTop:8,boxShadow:'0 3px 8px rgba(0,0,0,0.15)'};
  const linkTxt={textAlign:'center',fontSize:13,color:C.dark,cursor:'pointer',fontWeight:700};
  const otpBtn={border:'none',borderRadius:20,padding:'0 16px',minWidth:92,fontWeight:700,fontSize:12,whiteSpace:'nowrap',background:otpCooldown>0||busy?'#D8DFDB':C.gold,color:otpCooldown>0||busy?'#8E948F':C.dark,cursor:otpCooldown>0||busy?'default':'pointer'};

  const OtpRow = (
    <>
      <div style={fieldLabel}>{t('enterOtp')}</div>
      <div style={{display:'flex',gap:8,marginBottom:12}}>
        <input value={form.otp} onChange={e=>set('otp',e.target.value)} placeholder={t('enterOtp')} style={{...pillIn,marginBottom:0,flex:1}}/>
        <button type="button" onClick={sendOtp} disabled={otpCooldown>0||busy} style={otpBtn}>{otpCooldown>0?`${otpCooldown}s`:t('sendCode')}</button>
      </div>
    </>
  );

  return (
    <div style={{padding:'32px 24px 48px',maxWidth:480,margin:'0 auto',background:'linear-gradient(180deg,#DCEAE5,#C7DFD6)',minHeight:'calc(100vh - 64px)'}}>
      <div style={{textAlign:'center',marginBottom:18}}>
        <img src={LOGO_MAIN} alt="Taste of Desh" style={{width:'82%',maxWidth:280,height:'auto',margin:'0 auto',display:'block'}}/>
      </div>

      {mode==='login' && (
        <>
          <div style={{textAlign:'center',marginBottom:22}}>
            <div style={{fontWeight:900,fontSize:30,color:C.dark,marginBottom:10}}>{t('login')}</div>
            <div onClick={()=>switchMode('register')} style={linkTxt}>{t('noAccountYet')}</div>
          </div>
          <input value={form.email} onChange={e=>set('email',e.target.value)} placeholder={t('email')} style={pillIn}/>
          <input value={form.password} onChange={e=>set('password',e.target.value)} placeholder={t('password')} type="password" style={pillIn}/>
          <button onClick={doLogin} disabled={busy} style={pillBtn}>{busy?'...':t('login')}</button>
          <div onClick={()=>switchMode('reset')} style={{...linkTxt,marginTop:18}}>{t('forgotPassword')}</div>
        </>
      )}

      {mode==='register' && (
        <>
          <div style={{textAlign:'center',marginBottom:20}}>
            <div style={{fontWeight:900,fontSize:26,color:C.dark,lineHeight:1.25}}>{t('createAccount')}</div>
          </div>
          <div style={fieldLabel}>{t('name')}</div>
          <input value={form.name} onChange={e=>set('name',e.target.value)} placeholder={t('name')} style={pillIn}/>
          <div style={fieldLabel}>{t('email')}</div>
          <input value={form.email} onChange={e=>set('email',e.target.value)} placeholder={t('email')} style={pillIn}/>
          <div style={fieldLabel}>{t('password')}</div>
          <input value={form.password} onChange={e=>set('password',e.target.value)} placeholder={t('password')} type="password" style={pillIn}/>
          <div style={fieldLabel}>{t('confirmPassword')}</div>
          <input value={form.confirm} onChange={e=>set('confirm',e.target.value)} placeholder={t('confirmPassword')} type="password" style={pillIn}/>
          {OtpRow}
          <button onClick={doRegister} disabled={busy} style={pillBtn}>{busy?'...':t('signUp')}</button>
          <div onClick={()=>switchMode('login')} style={{...linkTxt,marginTop:18}}>{t('alreadyHaveAccount')}</div>
        </>
      )}

      {mode==='reset' && (
        <>
          <div style={{textAlign:'center',marginBottom:20}}>
            <div style={{fontWeight:900,fontSize:26,color:C.dark,lineHeight:1.25}}>{t('resetPassword')}</div>
          </div>
          <div style={fieldLabel}>{t('email')}</div>
          <input value={form.email} onChange={e=>set('email',e.target.value)} placeholder={t('email')} style={pillIn}/>
          <div style={fieldLabel}>{t('newPassword')}</div>
          <input value={form.newPassword} onChange={e=>set('newPassword',e.target.value)} placeholder={t('newPassword')} type="password" style={pillIn}/>
          <div style={fieldLabel}>{t('confirmPassword')}</div>
          <input value={form.newConfirm} onChange={e=>set('newConfirm',e.target.value)} placeholder={t('confirmPassword')} type="password" style={pillIn}/>
          {OtpRow}
          <button onClick={doReset} disabled={busy} style={pillBtn}>{busy?'...':t('verifyLogin')}</button>
          <div onClick={()=>switchMode('login')} style={{...linkTxt,marginTop:18}}>{t('login')}</div>
        </>
      )}
    </div>
  );
}

function ProfileTab({addrs,setAddrs,orders,auth,setAuth,lang,setLang,t}) {
  const [sec,setSec]=useState('main');
  const [na,setNa] = useState({name:'',mob:'',addr:''});
  const stC = {pending:{bg:G.goldl,c:G.yd},processing:{bg:G.bl,c:G.bd},shipped:{bg:G.pl,c:G.pd},completed:{bg:G.gl,c:G.gd}};
  const [addrBusy,setAddrBusy]=useState(false);
  // Addresses now persist in the `addresses` table. They used to live only in
  // React state, so every customer re-typed their address on every single order.
  async function addAddr(){
    if(!na.name||!na.mob||!na.addr) return;
    if(!auth.user?.id){ alert('Please log in first.'); return; }
    setAddrBusy(true);
    try{
      if(na.id){
        const { error } = await supabase.from('addresses')
          .update({ name: na.name, mobile: na.mob, address: na.addr })
          .eq('id', na.id);
        if(error){ alert('Failed to update address: '+error.message); return; }
        setAddrs(p=>p.map(a=>a.id===na.id?{...na}:a));
      } else {
        const { data, error } = await supabase.from('addresses')
          .insert({ customer_id: auth.user.id, name: na.name, mobile: na.mob, address: na.addr })
          .select().single();
        if(error){ alert('Failed to save address: '+error.message); return; }
        setAddrs(p=>[...p,{ id:data.id, name:data.name, mob:data.mobile, addr:data.address }]);
      }
      setNa({name:'',mob:'',addr:''});
      setSec('addrs');
    } finally { setAddrBusy(false); }
  }
  function editAddr(a){ setNa(a); setSec('addAddr'); }
  async function deleteAddr(id){
    if(!window.confirm('Delete this address?')) return;
    const { error } = await supabase.from('addresses').delete().eq('id', id);
    if(error){ alert('Failed to delete address: '+error.message); return; }
    setAddrs(p=>p.filter(a=>a.id!==id));
  }
  async function doLogout(){
  await supabase.auth.signOut();
  setAuth({loggedIn:false,user:null});
  setSec('main');
}

  if(!auth.loggedIn) return <AuthScreen onLogin={(u)=>setAuth({loggedIn:true,user:u})} t={t}/>;

  return(
    <div style={{padding:16}}>
      {sec==='main'&&(
        <div>
          <Card style={{marginBottom:16,background:G.grad,border:'none'}}>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:50,height:50,borderRadius:'50%',background:'rgba(255,255,255,0.22)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,color:G.w,fontWeight:'bold',flexShrink:0}}>
                {(auth.user?.name||'C')[0].toUpperCase()}
              </div>
              <div>
                <div style={{color:G.w,fontWeight:'bold',fontSize:15}}>{auth.user?.name||'Customer'}</div>
                <div style={{color:'rgba(255,255,255,0.8)',fontSize:11}}>{auth.user?.mobile||auth.user?.email||''}</div>
              </div>
            </div>
          </Card>
          {[{icon:'📦',label:t('myOrders'),cnt:orders.length,s:'orders'},{icon:'📍',label:t('savedAddresses'),cnt:addrs.length,s:'addrs'},{icon:'🌐',label:t('language'),cnt:null,s:'lang'},{icon:'💬',label:t('customerSupport'),cnt:null,s:'support'}].map(it=>(
            <div key={it.s} onClick={()=>setSec(it.s)} style={{background:G.w,borderRadius:13,padding:15,marginBottom:10,display:'flex',alignItems:'center',gap:12,cursor:'pointer',boxShadow:'0 2px 6px rgba(20,40,25,0.06)',border:`1px solid ${G.brd}`}}>
              <div style={{fontSize:26}}>{it.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:'bold',fontSize:13}}>{it.label}</div>
                {it.cnt!==null&&<div style={{fontSize:11,color:G.mut}}>{it.cnt} item{it.cnt!==1?'s':''}</div>}
              </div>
              <span style={{color:G.mut,fontSize:18}}>›</span>
            </div>
          ))}
          <div onClick={doLogout} style={{textAlign:'center',color:G.rd,fontWeight:'bold',fontSize:13,padding:14,cursor:'pointer'}}>🚪 {t('logout')}</div>
        </div>
      )}
      {sec==='orders'&&(
        <div>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14,cursor:'pointer'}} onClick={()=>setSec('main')}><span style={{fontSize:20}}>‹</span><span style={{fontWeight:'bold',fontSize:15}}>{t('myOrders')}</span></div>
          {orders.length===0?<div style={{textAlign:'center',color:G.mut,padding:40}}>{t('noOrdersYet')}</div>:orders.map(o=>{
            const sc=stC[o.status]||stC.pending;
            return(
              <Card key={o.id} style={{marginBottom:10}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                  <span style={{fontWeight:'bold',fontSize:13,color:G.gd}}>{o.id}</span>
                  <span style={{background:sc.bg,color:sc.c,borderRadius:10,padding:'2px 9px',fontSize:11,fontWeight:'bold'}}>{o.status}</span>
                </div>
                <div style={{fontSize:11,color:G.mut,marginBottom:4}}>{o.date}</div>
                <div style={{fontSize:12,color:G.tx,marginBottom:o.tracking.length?8:0}}>{o.items.map(i=>`${i.name} ×${i.qty}`).join(', ')}</div>
                {o.tracking.length>0&&(
                  <div style={{background:G.bl,borderRadius:8,padding:'8px 10px',fontSize:12}}>
                    <div style={{fontWeight:'bold',color:G.bd,marginBottom:3}}>📦 {t('tracking')}</div>
                    {o.tracking.map(tk=><div key={tk} style={{color:G.bd}}>{tk}</div>)}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
      {sec==='addrs'&&(
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <div style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer'}} onClick={()=>setSec('main')}><span style={{fontSize:20}}>‹</span><span style={{fontWeight:'bold',fontSize:15}}>{t('savedAddresses')}</span></div>
            <Btn sm onClick={()=>setSec('addAddr')}>+ Add</Btn>
          </div>
          {addrs.length===0
            ? <div style={{textAlign:'center',color:G.mut,padding:40}}>No saved addresses yet</div>
            : addrs.map(a=>(
              <Card key={a.id} style={{marginBottom:10}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:'bold',fontSize:13,marginBottom:4}}>{a.name}</div>
                    <div style={{fontSize:12,color:G.tx,marginBottom:2}}>📱 {a.mob}</div>
                    <div style={{fontSize:12,color:G.tx}}>📍 {a.addr}</div>
                  </div>
                  <div style={{display:'flex',gap:10,marginLeft:10}}>
                    <span onClick={()=>editAddr(a)} style={{cursor:'pointer',fontSize:16}} title="Edit">✏️</span>
                    <span onClick={()=>deleteAddr(a.id)} style={{cursor:'pointer',fontSize:16}} title="Delete">🗑️</span>
                  </div>
                </div>
              </Card>
            ))
          }
        </div>
      )}
      {sec==='addAddr'&&(
        <div>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14,cursor:'pointer'}} onClick={()=>{setNa({name:'',mob:'',addr:''});setSec('addrs');}}>
            <span style={{fontSize:20}}>‹</span>
            <span style={{fontWeight:'bold',fontSize:15}}>{na.id?'Edit Address':t('addAddress')}</span>
          </div>
          <FInput label={t('name')} value={na.name} onChange={v=>setNa(p=>({...p,name:v}))} req/>
          <FInput label={t('mobileNumber')} value={na.mob} onChange={v=>setNa(p=>({...p,mob:v}))} req/>
          <div style={{marginBottom:10}}>
            <div style={{fontSize:11,color:G.tx,marginBottom:3,fontWeight:'600'}}>{t('address')}<span style={{color:G.rd}}> *</span></div>
            <textarea value={na.addr} onChange={e=>setNa(p=>({...p,addr:e.target.value}))} style={{width:'100%',padding:'8px 11px',borderRadius:8,border:`1px solid ${G.brd}`,fontSize:13,boxSizing:'border-box',minHeight:70,resize:'vertical'}}/>
          </div>
          <Btn onClick={addAddr} disabled={addrBusy} style={{width:'100%',justifyContent:'center'}}>{addrBusy?'Saving…':(na.id?'Save Changes':t('saveAddress'))}</Btn>
        </div>
      )}
      {sec==='lang'&&(
        <div>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14,cursor:'pointer'}} onClick={()=>setSec('main')}><span style={{fontSize:20}}>‹</span><span style={{fontWeight:'bold',fontSize:15}}>{t('language')}</span></div>
          {[['en','English'],['zh','中文 (Chinese)'],['bn','বাংলা (Bengali)']].map(([code,label])=>(
            <div key={code} onClick={()=>setLang(code)} style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:G.w,borderRadius:12,padding:14,marginBottom:9,cursor:'pointer',border:`2px solid ${lang===code?G.gd:G.brd}`}}>
              <span style={{fontWeight:'bold',fontSize:13,color:lang===code?G.gd:G.tx}}>{label}</span>
              {lang===code&&<span style={{color:G.gd,fontSize:16}}>✓</span>}
            </div>
          ))}
        </div>
      )}
      {sec==='support'&&(
        <div>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14,cursor:'pointer'}} onClick={()=>setSec('main')}><span style={{fontSize:20}}>‹</span><span style={{fontWeight:'bold',fontSize:15}}>{t('customerSupport')}</span></div>
          <Card style={{textAlign:'center',padding:24}}>
            <div style={{fontSize:42,marginBottom:12}}>💬</div>
            <div style={{fontWeight:'bold',fontSize:16,marginBottom:8}}>{t('contactWechat')}</div>
            <div style={{color:G.tx,fontSize:13,marginBottom:16}}>For any questions or special requests, reach us on WeChat</div>
            <div style={{background:G.gl,borderRadius:10,padding:14,marginBottom:16}}>
              <div style={{fontWeight:'bold',fontSize:18,color:G.gd}}>WeChat ID: RaaTrade</div>
            </div>
            <div style={{width:170,height:170,margin:'0 auto',border:`3px solid ${G.gd}`,borderRadius:12,padding:8,background:G.w,boxSizing:'border-box'}}>
              <img src={WECHAT_QR} alt="WeChat QR Code - RaaTrade" style={{width:'100%',height:'100%',objectFit:'contain',borderRadius:6,display:'block'}}/>
            </div>
            <div style={{fontSize:12,color:G.tx,marginTop:10,fontWeight:600}}>Scan to add us on WeChat</div>
          </Card>
        </div>
      )}
    </div>
  );
}

function Checkout({step,setStep,info,setInfo,addrs,cart,rawTotal,discTotal,hasDsc,courierFee,grandTotal,totalGW,placeOrder,t,qrCodes,placing}) {
  const [method,setMethod] = useState('alipay');
  const [proofFile,setProofFile] = useState(null);   // the real File object
  const [proofPreview,setProofPreview] = useState('');
  const [selAddr,setSelAddr] = useState(null);
  const fileRef = useRef(null);
  const cameraRef = useRef(null);
  function selectAddr(a){setSelAddr(a.id);setInfo({name:a.name,mob:a.mob,addr:a.addr});}

  // Fix 4: a real file picker. Validates type + size, shows a preview,
  // and hands the actual File up to placeOrder() so it can be uploaded.
  function onPickFile(e){
    const f = e.target.files && e.target.files[0];
    if(!f) return;
    if(!f.type.startsWith('image/')){ alert('Please choose an image file (JPG or PNG).'); return; }
    if(f.size > 5*1024*1024){ alert('That image is larger than 5MB. Please choose a smaller one.'); return; }
    setProofFile(f);
    const reader = new FileReader();
    reader.onload = () => setProofPreview(reader.result);
    reader.readAsDataURL(f);
  }
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',zIndex:500,display:'flex',flexDirection:'column',justifyContent:'flex-end'}}>
      <div style={{background:G.w,borderRadius:'22px 22px 0 0',maxHeight:'92vh',overflow:'auto',padding:'0 18px 28px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'15px 0',borderBottom:`1px solid ${G.brd}`,marginBottom:18}}>
          <div style={{fontWeight:'bold',fontSize:17}}>{step==='info'?'📍 '+t('checkout'):step==='payment'?'💳 '+t('payment'):'✅ '+t('orderPlacedTitle')}</div>
          {step!=='done'&&<button onClick={()=>setStep(null)} style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:G.mut}}>✕</button>}
        </div>
        {step==='info'&&(
          <div>
            {addrs.length>0&&(
              <div style={{marginBottom:18}}>
                <div style={{fontWeight:'bold',fontSize:13,marginBottom:8,color:G.tx}}>📍 {t('savedAddresses')}</div>
                {addrs.map(a=>(
                  <div key={a.id} onClick={()=>selectAddr(a)} style={{padding:11,borderRadius:10,border:`2px solid ${selAddr===a.id?G.gd:G.brd}`,marginBottom:7,cursor:'pointer',background:selAddr===a.id?G.gl:G.w}}>
                    <div style={{fontWeight:'bold',fontSize:12,color:selAddr===a.id?G.gd:G.dk}}>{a.name}</div>
                    <div style={{fontSize:11,color:G.tx}}>📱 {a.mob} · 📍 {a.addr}</div>
                  </div>
                ))}
                <div style={{fontSize:11,color:G.mut,marginBottom:8,marginTop:4}}>{t('orAddManually')}</div>
              </div>
            )}
            <FInput label={t('fullName')} value={info.name} onChange={v=>setInfo(p=>({...p,name:v}))} req/>
            <FInput label={t('mobileNumber')} value={info.mob} onChange={v=>setInfo(p=>({...p,mob:v}))} req/>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:11,color:G.tx,marginBottom:3,fontWeight:'600'}}>{t('deliveryAddress')}<span style={{color:G.rd}}> *</span></div>
              <textarea value={info.addr} onChange={e=>setInfo(p=>({...p,addr:e.target.value}))} style={{width:'100%',padding:'8px 11px',borderRadius:8,border:`1px solid ${G.brd}`,fontSize:13,boxSizing:'border-box',minHeight:70,resize:'vertical'}}/>
            </div>
            <div style={{background:G.bg,borderRadius:10,padding:12,marginBottom:16,fontSize:13}}>
              <div style={{fontWeight:'bold',marginBottom:8}}>{t('orderSummary')}</div>
              {cart.map(i=><div key={i.id} style={{display:'flex',justifyContent:'space-between',marginBottom:3,fontSize:12}}><span>{i.name} ×{i.qty}</span><span>¥{(ep(i)*i.qty).toFixed(2)}</span></div>)}
              <div style={{borderTop:`1px solid ${G.brd}`,marginTop:8,paddingTop:8}}>
                {hasDsc&&<div style={{display:'flex',justifyContent:'space-between',fontSize:12,textDecoration:'line-through',color:G.mut}}><span>{t('subtotal')}</span><span>¥{rawTotal.toFixed(2)}</span></div>}
                {hasDsc&&<div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:G.gd,fontWeight:'bold'}}><span>{t('priceAfterDiscount')}</span><span>¥{discTotal.toFixed(2)}</span></div>}
                {!hasDsc&&<div style={{display:'flex',justifyContent:'space-between',fontSize:12}}><span>{t('subtotal')}</span><span>¥{rawTotal.toFixed(2)}</span></div>}
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12}}><span>{t('courier')} ({totalGW.toFixed(2)} kg)</span><span>¥{courierFee.toFixed(2)}</span></div>
                <div style={{display:'flex',justifyContent:'space-between',fontWeight:'bold',fontSize:15,marginTop:5,color:G.gd}}><span>{t('grandTotal')}</span><span>¥{grandTotal.toFixed(2)}</span></div>
              </div>
            </div>
            <button onClick={()=>{if(info.name&&info.mob&&info.addr)setStep('payment');}} style={{width:'100%',background:info.name&&info.mob&&info.addr?G.gd:G.mut,color:G.w,border:'none',borderRadius:12,padding:14,cursor:'pointer',fontSize:15,fontWeight:'bold'}}>
              {t('continueToPayment')} →
            </button>
          </div>
        )}
        {step==='payment'&&(
          <div>
            <div style={{display:'flex',gap:8,marginBottom:18}}>
              {['alipay','wechat'].map(m=>(
                <button key={m} onClick={()=>setMethod(m)} style={{flex:1,padding:12,border:`2px solid ${method===m?G.gd:G.brd}`,borderRadius:10,background:method===m?G.gl:G.w,cursor:'pointer',fontWeight:'bold',fontSize:13}}>
                  {m==='alipay'?'💙 Alipay':'💚 WeChat Pay'}
                </button>
              ))}
            </div>
            <div style={{textAlign:'center',background:G.bg,borderRadius:12,padding:22,marginBottom:18}}>
              <div style={{fontWeight:'bold',fontSize:15,marginBottom:12}}>{method==='alipay'?'💙 '+t('scanWithAlipay'):'💚 '+t('scanWithWechat')}</div>
              <div style={{display:'inline-block',background:G.w,padding:14,borderRadius:12,boxShadow:'0 2px 10px rgba(0,0,0,0.1)',marginBottom:10}}>
                {qrCodes && qrCodes[method] ? (
                  <img src={qrCodes[method]} alt={method+' QR code'} style={{width:160,height:160,objectFit:'contain',borderRadius:8,display:'block'}}/>
                ) : (
                <div style={{width:160,height:160,background:method==='alipay'?'#1677FF':'#07C160',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <div style={{background:G.w,borderRadius:8,padding:'10px 14px',textAlign:'center'}}>
                    <div style={{fontSize:28}}>{method==='alipay'?'💙':'💚'}</div>
                    <div style={{fontSize:12,fontWeight:'bold',color:G.tx}}>Payment QR Code</div>
                    <div style={{fontSize:13,fontWeight:'bold',color:G.gd}}>¥{grandTotal.toFixed(2)}</div>
                  </div>
                </div>
                )}
              </div>
              <div style={{fontSize:13,color:G.tx}}>Amount: <strong style={{color:G.gd,fontSize:15}}>¥{grandTotal.toFixed(2)}</strong></div>
            </div>
            <div style={{background:G.goldl,borderRadius:10,padding:12,marginBottom:18,fontSize:12,color:G.yd}}>
              <div style={{fontWeight:'bold',marginBottom:4}}>📸 Steps:</div>
              <div>1. Scan QR code &amp; complete payment</div>
              <div>2. Screenshot the confirmation page</div>
              <div>3. Upload screenshot below as proof</div>
            </div>
            {/* Gallery input has NO capture attribute, so phones show the photo
                library / file picker. The camera input keeps capture, so it opens
                the camera directly. Two buttons = no guessing for the customer. */}
            <input ref={fileRef}    type="file" accept="image/*" onChange={onPickFile} style={{display:'none'}}/>
            <input ref={cameraRef}  type="file" accept="image/*" capture="environment" onChange={onPickFile} style={{display:'none'}}/>
            {!proofFile ? (
              <div style={{border:`2px dashed ${G.brd}`,borderRadius:12,padding:18,textAlign:'center',background:G.w,marginBottom:18}}>
                <div style={{fontSize:30,marginBottom:8}}>🧾</div>
                <div style={{color:G.tx,fontSize:13,marginBottom:12}}>{t('uploadProof')}</div>
                <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap'}}>
                  <Btn onClick={()=>fileRef.current&&fileRef.current.click()}>🖼️ Choose from Gallery</Btn>
                  <Btn v='outline' onClick={()=>cameraRef.current&&cameraRef.current.click()}>📷 Take Photo</Btn>
                </div>
                <div style={{color:G.mut,fontSize:11,marginTop:10}}>JPG, PNG · max 5MB</div>
              </div>
            ) : (
              <div onClick={()=>fileRef.current&&fileRef.current.click()} style={{border:`2px dashed ${G.g}`,borderRadius:12,padding:12,textAlign:'center',cursor:'pointer',background:G.gl,marginBottom:18}}>
                {proofPreview&&<img src={proofPreview} alt="Payment proof" style={{maxWidth:'100%',maxHeight:180,objectFit:'contain',borderRadius:8,marginBottom:8,display:'block',margin:'0 auto 8px'}}/>}
                <div style={{color:G.gd,fontWeight:'bold',fontSize:13}}>✅ {t('paymentUploaded')}</div>
                <div style={{color:G.mut,fontSize:11,marginTop:2}}>Tap to choose a different image</div>
              </div>
            )}
            <button disabled={!proofFile||placing} onClick={()=>{ if(proofFile&&!placing) placeOrder(method, proofFile); }}
              style={{width:'100%',background:(proofFile&&!placing)?G.gd:G.mut,color:G.w,border:'none',borderRadius:12,padding:14,cursor:(proofFile&&!placing)?'pointer':'not-allowed',fontSize:15,fontWeight:'bold'}}>
              {placing ? 'Placing your order…' : t('submitOrder')}
            </button>
          </div>
        )}
        {step==='done'&&(
          <div style={{textAlign:'center',padding:'20px 0 40px'}}>
            <div style={{fontSize:70,marginBottom:14}}>🎉</div>
            <div style={{fontSize:21,fontWeight:'bold',color:G.gd,marginBottom:10}}>{t('thankYou')}</div>
            <div style={{fontSize:13,color:G.tx,marginBottom:22,lineHeight:1.7}}>Your order has been placed successfully.<br/>We will dispatch it soon and notify you with tracking information.</div>
            <div style={{background:G.gl,borderRadius:10,padding:14,marginBottom:22}}>
              <div style={{color:G.gd,fontWeight:'bold',fontSize:13}}>🚚 {t('dispatchSoon')}</div>
            </div>
            <button onClick={()=>setStep(null)} style={{background:G.gd,color:G.w,border:'none',borderRadius:12,padding:'13px 36px',cursor:'pointer',fontSize:14,fontWeight:'bold'}}>{t('continueShopping')}</button>
          </div>
        )}
      </div>
    </div>
  );
}

function CustomerApp({prods,cats,cart,addToCart,rm,upd,orders,setOrders,setCart,lang,setLang,auth,setAuth,customSlides,qrCodes,onOrdersChanged,reloadProducts}) {
  const [tab,setTab] = useState('home');
  const [coStep,setCO] = useState(null);
  const [info,setInfo] = useState({name:'',mob:'',addr:''});
  const [addrs,setAddrs] = useState([]);
  const [placing,setPlacing] = useState(false);
  const [pendingCheckout,setPendingCheckout] = useState(false);
  const t = useT(lang);
  const cartN=cart.reduce((s,i)=>s+i.qty,0);
  const rawTotal=cart.reduce((s,i)=>s+i.sp*i.qty,0);
  const discTotal=cart.reduce((s,i)=>s+ep(i)*i.qty,0);
  const hasDsc=rawTotal!==discTotal;
  const totalGW=cart.reduce((s,i)=>s+i.gw*i.qty,0);
  const courierFee=cf(totalGW);
  const grandTotal=discTotal+courierFee;
  useEffect(()=>{
    if(auth.loggedIn&&info.name===''&&auth.user){
      setInfo(p=>({...p,name:auth.user.name||'',mob:auth.user.mobile||''}));
    }
  },[auth.loggedIn]);
  // Load this customer's saved addresses. RLS makes sure they only ever
  // see their own rows, so no filtering is needed beyond the account id.
  useEffect(()=>{
    async function loadAddrs(){
      if(!auth.loggedIn || !auth.user?.id){ setAddrs([]); return; }
      const { data, error } = await supabase.from('addresses')
        .select('*').eq('customer_id', auth.user.id).order('id');
      if(error){ console.error('loadAddresses error:', error.message); return; }
      setAddrs((data||[]).map(r=>({ id:r.id, name:r.name, mob:r.mobile, addr:r.address })));
    }
    loadAddrs();
  },[auth.loggedIn, auth.user?.id]);

  // Fix 3: if a logged-out customer taps checkout, send them to the login
  // screen, then bounce them straight back into checkout once they're in.
  function requireLogin(){ setPendingCheckout(true); setTab('profile'); }
  useEffect(()=>{
    if(pendingCheckout && auth.loggedIn){
      setPendingCheckout(false);
      setTab('cart');
      setCO('info');
    }
  },[pendingCheckout, auth.loggedIn]);

  // STAGE 5 + atomic stock: the whole order goes through one database function.
  // place_order() checks stock, creates the order and its items, and decrements
  // stock — all inside ONE transaction. That's what stops two customers from both
  // buying the last item at the same moment. A check done in the browser can't do
  // this: anyone can edit the numbers in DevTools, and two tabs can race each other.
  async function placeOrder(method, proofFile){
    if(placing) return;
    if(!auth.loggedIn || !auth.user?.id){ alert('Please log in before placing an order.'); return; }
    if(cart.length===0){ alert('Your cart is empty.'); return; }
    setPlacing(true);
    try {
      // 1. Upload the payment screenshot to Storage.
      let proofUrl = '';
      if(proofFile){
        proofUrl = await uploadToBucket('payment-proofs', proofFile, auth.user.id);
      }

      // 2. One atomic call. If stock ran out, the database refuses and nothing is written.
      const orderId = `ORD${Date.now().toString(36).toUpperCase()}`;
      const { error } = await supabase.rpc('place_order', {
        p_order_id:   orderId,
        p_date:       bjDate(),
        p_time:       bjTime(),
        p_name:       info.name,
        p_mobile:     info.mob,
        p_address:    info.addr,
        p_items:      cart.map(i=>({
                        product_id:   i.id,
                        name:         i.name,
                        qty:          i.qty,
                        unit_price:   ep(i),
                        gross_weight: i.gw,
                        discount:     i.disc || 0,
                      })),
        p_disc_total: discTotal,
        p_courier:    courierFee,
        p_proof_url:  proofUrl,
        p_method:     method || 'alipay',
      });
      if(error) throw new Error(error.message);

      // 3. Success — clear the cart, refresh orders and the now-reduced stock.
      setCart([]);
      if(onOrdersChanged)  await onOrdersChanged();
      if(reloadProducts)   await reloadProducts();
      setCO('done');
    } catch(err){
      console.error('placeOrder error:', err);
      alert(err.message || 'Something went wrong placing your order. Please try again.');
      // Pull fresh stock so the cart reflects what's actually left.
      if(reloadProducts) await reloadProducts();
      setCO(null); setTab('cart');
    } finally {
      setPlacing(false);
    }
  }

  // Only THIS customer's orders — matched on the account that placed them,
  // not on a typed-in name (which anyone could reuse).
  // A customer sees their own orders, but not ones the shop has cancelled —
  // a cancelled order shouldn't linger in their list showing stale item info.
  const myOrders=orders.filter(o=>o.userId && o.userId===auth.user?.id && o.status!=='cancelled');
  return(
    <div style={{maxWidth:480,margin:'0 auto',background:'#FAFBFA',minHeight:'calc(100vh - 48px)',position:'relative'}}>
      <div style={{background:'#1B7D3F',padding:'0 16px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
        <img src={BANNER_TOP} alt="Taste of Desh - A Heart of Bangladesh in China" style={{height:'auto',width:'auto',maxHeight:64,maxWidth:'58%',display:'block',flexShrink:0}}/>
        {cartN>0&&(
          <div onClick={()=>setTab('cart')} style={{background:G.gold,borderRadius:20,padding:'5px 11px',display:'flex',alignItems:'center',gap:5,cursor:'pointer'}}>
            <span>🛒</span><span style={{fontWeight:'bold',color:G.gd,fontSize:12}}>{cartN} | ¥{discTotal.toFixed(0)}</span>
          </div>
        )}
      </div>
      <div style={{paddingBottom:68}}>
        {tab==='home'&&<HomeTab products={prods} categories={cats} addToCart={addToCart} setTab={setTab} t={t} customSlides={customSlides}/>}
        {tab==='categories'&&<CatTab products={prods} categories={cats} addToCart={addToCart} t={t}/>}
        {tab==='cart'&&<CartTab cart={cart} prods={prods} rawTotal={rawTotal} discTotal={discTotal} hasDsc={hasDsc} totalGW={totalGW} courierFee={courierFee} grandTotal={grandTotal} upd={upd} rm={rm} setCO={setCO} t={t} auth={auth} onRequireLogin={requireLogin}/>}
        {tab==='profile'&&<ProfileTab addrs={addrs} setAddrs={setAddrs} orders={myOrders} auth={auth} setAuth={setAuth} lang={lang} setLang={setLang} t={t}/>}
      </div>
      {cartN>0&&tab!=='cart'&&tab!=='profile'&&(
        <div onClick={()=>setTab('cart')} style={{position:'fixed',bottom:73,left:'50%',transform:'translateX(-50%)',maxWidth:444,width:'calc(100% - 32px)',background:G.gd,color:G.w,borderRadius:22,padding:'11px 18px',display:'flex',alignItems:'center',gap:10,cursor:'pointer',boxShadow:'0 4px 18px rgba(0,0,0,0.28)',zIndex:50}}>
          <div style={{background:G.gold,color:G.gd,borderRadius:'50%',width:27,height:27,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:'bold',fontSize:12,flexShrink:0}}>{cartN}</div>
          <div style={{flex:1}}><div style={{fontWeight:'bold',fontSize:13}}>{cartN} item{cartN>1?'s':''} in cart</div><div style={{fontSize:11,opacity:0.8}}>Tap to view</div></div>
          <div style={{fontWeight:'bold',fontSize:15}}>¥{grandTotal.toFixed(2)}</div>
          <div style={{fontSize:18}}>›</div>
        </div>
      )}
      <div style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:480,background:G.w,borderTop:`2px solid ${G.bg2}`,display:'flex',zIndex:100,boxShadow:'0 -2px 8px rgba(0,0,0,0.08)'}}>
        {[{id:'home',icon:'🏠',l:t('home')},{id:'categories',icon:'🏪',l:t('shop')},{id:'cart',icon:'🛒',l:t('cart'),b:cartN},{id:'profile',icon:'👤',l:t('me')}].map(tb=>(
          <button key={tb.id} onClick={()=>setTab(tb.id)} style={{flex:1,padding:'8px 4px 5px',border:'none',background:'none',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:2,position:'relative'}}>
            <span style={{fontSize:20}}>{tb.icon}</span>
            {tb.b>0&&<div style={{position:'absolute',top:4,right:'28%',background:'#E53935',color:G.w,borderRadius:'50%',width:15,height:15,fontSize:9,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:'bold'}}>{tb.b}</div>}
            <span style={{fontSize:10,color:tab===tb.id?G.gd:G.mut,fontWeight:tab===tb.id?'bold':'normal'}}>{tb.l}</span>
            {tab===tb.id&&<div style={{position:'absolute',bottom:0,left:'20%',right:'20%',height:2,background:G.gd,borderRadius:2}}/>}
          </button>
        ))}
      </div>
      {coStep&&<Checkout step={coStep} setStep={setCO} info={info} setInfo={setInfo} addrs={addrs} cart={cart} rawTotal={rawTotal} discTotal={discTotal} hasDsc={hasDsc} courierFee={courierFee} grandTotal={grandTotal} totalGW={totalGW} placeOrder={placeOrder} t={t} qrCodes={qrCodes} placing={placing}/>}
    </div>
  );
}

function DashTab({prods,inv,orders,sales,catColors,customSlides,setCustomSlides,qrCodes,setQrCodes}) {
  // Load the charting library only when this tab actually renders. Vite splits
  // this into its own chunk, so it never touches the customer-facing bundle.
  const [RC,setRC]=useState(null);
  useEffect(()=>{ let ok=true; import('recharts').then(m=>{ if(ok) setRC(m); }); return ()=>{ ok=false; }; },[]);
  const lowStock=prods.filter(p=>p.stock<3);
  const outStock=prods.filter(p=>p.stock<=0);
  const expiring=inv.filter(i=>{const d=(new Date(i.exp)-new Date())/86400000;return d>0&&d<90;});
  const expired=inv.filter(i=>new Date(i.exp)<new Date()&&i.qty>0);
  // Group the low-stock list by category so the alerts panel reads as a table
  // instead of one giant run-on paragraph.
  const lowByCat=useMemo(()=>{
    const m={};
    lowStock.forEach(p=>{ (m[p.cat||'Uncategorised']=m[p.cat||'Uncategorised']||[]).push(p); });
    return Object.entries(m).sort((a,b)=>a[0].localeCompare(b[0]));
  },[prods]);
  const totalRev=sales.reduce((s,o)=>s+o.grand,0);
  const pendingN=orders.filter(o=>o.status==='pending').length;
  const [capt,setCapt]=useState('');
  const [upBusy,setUpBusy]=useState('');
  // Slideshow images and QR codes go to Storage too — site_settings used to hold
  // base64 blobs, which every visitor downloaded on every page load.
  async function handleSlideImg(e){
    const f=e.target.files[0]; if(!f) return;
    setUpBusy('slide');
    try{
      const url = await uploadToBucket('site-images', f, 'slides');
      const next=[...customSlides,{id:nid(customSlides),img:url,caption:capt}];
      const { error } = await supabase.from('site_settings').update({custom_slides:next}).eq('id',true);
      if(error) throw new Error('Failed to save slide: '+error.message);
      setCustomSlides(next);
      setCapt('');
    }catch(err){ alert(err.message); }
    finally{ setUpBusy(''); e.target.value=''; }
  }
  async function delSlide(id){
    const next=customSlides.filter(s=>s.id!==id);
    const { error } = await supabase.from('site_settings').update({custom_slides:next}).eq('id',true);
    if(error){alert('Failed to delete slide: '+error.message);return;}
    setCustomSlides(next);
  }
  async function handleQRImg(method,e){
    const f=e.target.files[0]; if(!f) return;
    setUpBusy(method);
    try{
      const url = await uploadToBucket('site-images', f, 'qr');
      const next={...qrCodes,[method]:url};
      const { error } = await supabase.from('site_settings').update({qr_codes:next}).eq('id',true);
      if(error) throw new Error('Failed to save QR code: '+error.message);
      setQrCodes(next);
    }catch(err){ alert(err.message); }
    finally{ setUpBusy(''); e.target.value=''; }
  }
  async function delQR(method){
    const next={...qrCodes,[method]:''};
    const { error } = await supabase.from('site_settings').update({qr_codes:next}).eq('id',true);
    if(error){alert('Failed to remove QR: '+error.message);return;}
    setQrCodes(next);
  }
  // Real numbers, computed from the sales table — the last 6 months including
  // this one. This used to be a hardcoded array of made-up figures.
  const monthly = useMemo(()=>{
    const now = new Date();
    const buckets = [];
    for(let k=5;k>=0;k--){
      const d = new Date(now.getFullYear(), now.getMonth()-k, 1);
      buckets.push({
        key: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,
        m: d.toLocaleString('en',{month:'short'}),
        sales:0, cost:0, profit:0, courier:0,
      });
    }
    const byKey = {};
    buckets.forEach(b=>{ byKey[b.key]=b; });
    sales.forEach(sl=>{
      if(!sl.date) return;
      const b = byKey[String(sl.date).slice(0,7)];   // 'YYYY-MM-DD' -> 'YYYY-MM'
      if(!b) return;
      const rev  = +sl.grand   || 0;
      const cour = +sl.courier || 0;
      // Cost of goods sold: match each line item back to its product's cost price.
      const cost = (sl.items||[]).reduce((sum,it)=>{
        const pr = prods.find(x=>x.name===it.name);
        return sum + ((pr && pr.cp) ? pr.cp * it.qty : 0);
      },0);
      b.sales   += rev;
      b.cost    += cost;
      b.courier += cour;
      b.profit  += rev - cost - cour;
    });
    return buckets.map(b=>({
      m: b.m,
      sales:   +b.sales.toFixed(2),
      cost:    +b.cost.toFixed(2),
      profit:  +b.profit.toFixed(2),
      courier: +b.courier.toFixed(2),
    }));
  },[sales,prods]);

  // Top products by units actually sold, not by list price.
  const topProds = useMemo(()=>{
    const sold = {};
    sales.forEach(sl=>(sl.items||[]).forEach(it=>{
      sold[it.name] = (sold[it.name]||0) + (+it.qty||0);
    }));
    return [...prods]
      .map(pr=>({...pr, sold: sold[pr.name]||0}))
      .sort((a,b)=> (b.sold-a.sold) || (b.sp-a.sp))
      .slice(0,5);
  },[prods,sales]);
  const noSales = sales.length===0;
  return(
    <div>
      <div style={{fontSize:19,fontWeight:'bold',color:G.dk,marginBottom:16}}>📊 Dashboard</div>
      {(lowStock.length>0||expired.length>0||expiring.length>0)&&(
        <Card style={{marginBottom:18,border:`1px solid ${G.gold}`,background:'#FFFDF5'}}>
          <div style={{fontWeight:'bold',color:G.yd,marginBottom:12,fontSize:15}}>⚠️ Alerts</div>

          {/* Summary chips */}
          <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:lowByCat.length?14:0}}>
            {outStock.length>0&&<div style={{background:'#FDECEA',border:`1px solid ${G.rd}`,borderRadius:8,padding:'6px 12px',fontSize:12,color:G.rd,fontWeight:'bold'}}>⛔ {outStock.length} out of stock</div>}
            <div style={{background:'#FFF3E0',border:`1px solid ${G.yd}`,borderRadius:8,padding:'6px 12px',fontSize:12,color:'#8a6d00',fontWeight:'bold'}}>🔻 {lowStock.length} low stock (&lt;3)</div>
            {expiring.length>0&&<div style={{background:'#FFF8E1',border:`1px solid ${G.yd}`,borderRadius:8,padding:'6px 12px',fontSize:12,color:'#8a6d00',fontWeight:'bold'}}>⏳ {expiring.length} expiring soon</div>}
            {expired.length>0&&<div style={{background:'#FDECEA',border:`1px solid ${G.rd}`,borderRadius:8,padding:'6px 12px',fontSize:12,color:G.rd,fontWeight:'bold'}}>💀 {expired.length} expired batch(es)</div>}
          </div>

          {/* Low-stock table, grouped by category */}
          {lowByCat.length>0&&(
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                <thead>
                  <tr style={{background:G.gd,color:G.w}}>
                    <th style={{padding:'8px 10px',textAlign:'left'}}>Category</th>
                    <th style={{padding:'8px 10px',textAlign:'left'}}>Product</th>
                    <th style={{padding:'8px 10px',textAlign:'center',whiteSpace:'nowrap'}}>Stock left</th>
                  </tr>
                </thead>
                <tbody>
                  {lowByCat.map(([cat,items])=>items.map((p,idx)=>(
                    <tr key={p.id} style={{borderBottom:`1px solid ${G.brd}`}}>
                      {idx===0&&<td rowSpan={items.length} style={{padding:'7px 10px',verticalAlign:'top',fontWeight:'bold',borderRight:`1px solid ${G.brd}`}}><CatChip cat={cat} catColors={catColors}/></td>}
                      <td style={{padding:'7px 10px'}}>{p.name}</td>
                      <td style={{padding:'7px 10px',textAlign:'center'}}>
                        <span style={{background:p.stock<=0?'#FDECEA':'#FFF3E0',color:p.stock<=0?G.rd:'#8a6d00',fontWeight:'bold',padding:'2px 10px',borderRadius:20,display:'inline-block',minWidth:24}}>{p.stock}</span>
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
      <Card style={{marginBottom:18}}>
        <div style={{fontWeight:'bold',fontSize:14,marginBottom:4,color:G.dk}}>🖼️ Home Slideshow Images</div>
        <div style={{fontSize:11,color:G.mut,marginBottom:12}}>Upload pictures to feature them in the rotating slideshow at the top of the customer Home page.</div>
        <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'flex-end',marginBottom:14}}>
          <div style={{flex:1,minWidth:160}}><FInput label="Caption (optional)" value={capt} onChange={setCapt}/></div>
          <div style={{background:G.gl,border:`1px solid ${G.g}`,borderRadius:9,padding:11,marginBottom:11,fontSize:11,color:G.tx,lineHeight:1.65}}>
            <div style={{fontWeight:'bold',color:G.gd,fontSize:12,marginBottom:3}}>📐 Recommended size: 1200 × 576 px</div>
            The slideshow panel is a wide landscape banner — roughly <b>2 parts wide to 1 part tall</b>.
            Any size will work: the picture is scaled to fit and a blurred copy of it fills whatever is left over.
            But an image at this ratio fills the panel edge to edge, with no blurred border.
            <div style={{marginTop:4,color:G.mut}}>Keep important text out of the bottom strip — that's where the caption sits.</div>
          </div>
          <div style={{marginBottom:10}}>
            <input type="file" accept="image/*" onChange={handleSlideImg} disabled={upBusy==='slide'} style={{fontSize:12}}/>
            {upBusy==='slide'&&<div style={{fontSize:11,color:G.bd,fontWeight:'bold',marginTop:4}}>⏳ Uploading…</div>}
          </div>
        </div>
        {customSlides.length===0
          ? <div style={{color:G.mut,fontSize:12}}>No custom slides yet.</div>
          : (
            <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
              {customSlides.map(s=>(
                <div key={s.id} style={{position:'relative',width:140}}>
                  <img src={s.img} alt={s.caption||'Slide'} style={{width:140,height:90,objectFit:'contain',borderRadius:9,border:`1px solid ${G.brd}`,display:'block',...CHECKER}}/>
                  {s.caption&&<div style={{fontSize:10,color:G.tx,marginTop:4,maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.caption}</div>}
                  <button onClick={()=>delSlide(s.id)} style={{position:'absolute',top:4,right:4,background:'rgba(0,0,0,0.55)',color:'#fff',border:'none',borderRadius:'50%',width:22,height:22,cursor:'pointer',fontSize:12}}>✕</button>
                </div>
              ))}
            </div>
          )
        }
      </Card>
      <Card style={{marginBottom:18}}>
        <div style={{fontWeight:'bold',fontSize:14,marginBottom:4,color:G.dk}}>💳 Payment QR Codes</div>
        <div style={{fontSize:11,color:G.mut,marginBottom:14}}>Upload your real Alipay and WeChat Pay QR codes — customers will see these during checkout instead of the placeholder.</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:16}}>
          {[['alipay','💙 Alipay'],['wechat','💚 WeChat Pay']].map(([m,l])=>(
            <div key={m} style={{textAlign:'center'}}>
              <div style={{fontWeight:'bold',fontSize:12,marginBottom:8,color:G.dk}}>{l}</div>
              {qrCodes && qrCodes[m] ? (
                <div style={{position:'relative',display:'inline-block'}}>
                  <img src={qrCodes[m]} style={{width:140,height:140,objectFit:'contain',borderRadius:9,border:`1px solid ${G.brd}`,display:'block',background:G.w}}/>
                  <button onClick={()=>delQR(m)} style={{position:'absolute',top:4,right:4,background:'rgba(0,0,0,0.55)',color:'#fff',border:'none',borderRadius:'50%',width:22,height:22,cursor:'pointer',fontSize:12}}>✕</button>
                </div>
              ) : (
                <div style={{width:140,height:140,margin:'0 auto',borderRadius:9,border:`2px dashed ${G.brd}`,display:'flex',alignItems:'center',justifyContent:'center',color:G.mut,fontSize:11,background:G.bg}}>No QR yet</div>
              )}
              <div style={{marginTop:9}}>
                <input type="file" accept="image/*" onChange={e=>handleQRImg(m,e)} disabled={upBusy===m} style={{fontSize:11}}/>
                {upBusy===m&&<div style={{fontSize:11,color:G.bd,fontWeight:'bold',marginTop:4}}>⏳ Uploading…</div>}
              </div>
            </div>
          ))}
        </div>
      </Card>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:12,marginBottom:20}}>
        <Stat icon="💰" label="Total Revenue (¥)" value={`¥${Math.round(totalRev)}`} color={G.gd}/>
        <Stat icon="🛒" label="Pending Orders" value={pendingN} color={G.yd}/>
        <Stat icon="📦" label="Products" value={prods.length} color={G.bd}/>
        <Stat icon="⚠️" label="Low Stock Items" value={lowStock.length} color={G.rd}/>
      </div>
      <Card style={{marginBottom:18}}>
        <div style={{fontWeight:'bold',fontSize:14,marginBottom:4,color:G.dk}}>📈 Monthly Performance (RMB)</div>
        <div style={{fontSize:11,color:G.mut,marginBottom:12}}>Last 6 months, from your Sales List. Cost is calculated from each product's cost price.</div>
        {noSales&&<div style={{fontSize:12,color:G.yd,background:G.goldl,borderRadius:8,padding:10,marginBottom:12}}>No sales recorded yet — this chart will fill in as orders are completed.</div>}
        {RC
          ? <RC.ResponsiveContainer width="100%" height={220}>
              <RC.BarChart data={monthly}><RC.CartesianGrid strokeDasharray="3 3"/><RC.XAxis dataKey="m" fontSize={11}/><RC.YAxis fontSize={11}/><RC.Tooltip/><RC.Legend/>
                <RC.Bar dataKey="sales" name="Sales" fill={G.gm}/><RC.Bar dataKey="cost" name="Cost" fill="#EF9A9A"/><RC.Bar dataKey="profit" name="Profit" fill={G.gold}/>
              </RC.BarChart>
            </RC.ResponsiveContainer>
          : <div style={{height:220,display:'flex',alignItems:'center',justifyContent:'center',color:G.mut,fontSize:12}}>Loading chart</div>}
      </Card>
      <Card style={{marginBottom:18}}>
        <div style={{fontWeight:'bold',fontSize:14,marginBottom:14,color:G.dk}}>🚚 Courier Cost by Month (¥)</div>
        {RC
          ? <RC.ResponsiveContainer width="100%" height={180}>
              <RC.LineChart data={monthly}><RC.CartesianGrid strokeDasharray="3 3"/><RC.XAxis dataKey="m" fontSize={11}/><RC.YAxis fontSize={11}/><RC.Tooltip/>
                <RC.Line type="monotone" dataKey="courier" name="Courier" stroke={G.bd} strokeWidth={2} dot={{fill:G.bd}}/>
              </RC.LineChart>
            </RC.ResponsiveContainer>
          : <div style={{height:180,display:'flex',alignItems:'center',justifyContent:'center',color:G.mut,fontSize:12}}>Loading chart</div>}
      </Card>
      <Card style={{marginBottom:18}}>
        <div style={{fontWeight:'bold',fontSize:14,marginBottom:12,color:G.dk}}>⭐ Top Products</div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead><tr style={{background:G.gd,color:G.w}}>
              <th style={{padding:'8px 10px',textAlign:'left'}}>#</th><th style={{padding:'8px 10px',textAlign:'left'}}>Product</th>
              <th style={{padding:'8px 10px',textAlign:'center'}}>Category</th><th style={{padding:'8px 10px',textAlign:'center'}}>Units Sold</th><th style={{padding:'8px 10px',textAlign:'center'}}>Price</th><th style={{padding:'8px 10px',textAlign:'center'}}>Stock</th>
            </tr></thead>
            <tbody>{topProds.map((p,i)=>(
              <tr key={p.id} style={{background:i%2===0?G.w:G.bg,borderBottom:`1px solid ${G.brd}`}}>
                <td style={{padding:'7px 10px',fontWeight:'bold'}}>{i+1}</td><td style={{padding:'7px 10px'}}>{p.name}</td>
                <td style={{padding:'7px 10px',textAlign:'center'}}><CatChip cat={p.cat} catColors={catColors}/></td>
                <td style={{padding:'7px 10px',textAlign:'center',fontWeight:'bold',color:p.sold>0?G.gd:G.mut}}>{p.sold}</td>
                <td style={{padding:'7px 10px',textAlign:'center'}}>¥{p.sp}</td>
                <td style={{padding:'7px 10px',textAlign:'center'}}><span style={{...stStyle(p.stock),padding:'2px 8px',borderRadius:5,display:'inline-block'}}>{p.stock}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Card>
      {expiring.length>0&&(
        <Card>
          <div style={{fontWeight:'bold',fontSize:14,marginBottom:10,color:G.rd}}>⚠️ Expiring Soon (&lt;3 months)</div>
          {expiring.map(i=>(
            <div key={i.id} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:`1px solid ${G.brd}`,fontSize:12}}>
              <span>{i.name}</span><span style={{color:G.rd,fontWeight:'bold'}}>Exp: {i.exp} (Qty: {i.qty})</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

// A read-only stock display for the product forms. Stock is now owned entirely by
// the Inventory tab: products.stock is the sum of that product's inventory batches,
// kept in step by a database trigger. You raise stock by adding an inventory batch,
// not by typing a number here.
function StockReadout({value,note}) {
  return (
    <div style={{marginBottom:10}}>
      <div style={{fontSize:11,fontWeight:'600',marginBottom:3,color:'#555'}}>Stock Quantity</div>
      <div style={{padding:'8px 11px',borderRadius:8,border:'1px dashed #bbb',background:'#F5F5F5',fontSize:13,color:'#333',display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
        <span style={{fontWeight:'bold'}}>{value===''||value==null?'—':value}</span>
        <span style={{fontSize:10,color:'#888'}}>🔒 from Inventory</span>
      </div>
      <div style={{fontSize:10,color:'#888',marginTop:4}}>{note||'Add stock in the Inventory tab. This number is the total of all batches.'}</div>
    </div>
  );
}

// ==================== Editing ====================

// In BULK mode a field does nothing until you tick it. That's the whole point:
// "edit 12 products" must never quietly overwrite a field you didn't mean to touch.
// Untouched = untouched.
function BulkField({on,setOn,k,label,children}) {
  const active = !!on[k];
  return (
    <div style={{marginBottom:10,opacity:active?1:0.45,transition:'opacity 0.15s'}}>
      <label style={{display:'flex',alignItems:'center',gap:6,fontSize:11,fontWeight:'600',marginBottom:3,cursor:'pointer',color:active?G.gd:G.mut}}>
        <input type="checkbox" checked={active} onChange={e=>setOn(p=>({...p,[k]:e.target.checked}))}/>
        {label}
      </label>
      <div style={{pointerEvents:active?'auto':'none'}}>{children}</div>
    </div>
  );
}

// Edit one product, or many at once. Same component — it just changes shape.
function ProdEditOverlay({items,cats,onClose,onSaved}) {
  const bulk = items.length > 1;
  const one  = items[0];
  const [on,setOn]         = useState({});
  const [busy,setBusy]     = useState(false);
  const [imgBusy,setImgBusy] = useState(false);
  const [cutBg,setCutBg]   = useState(true);
  const [f,setF] = useState(bulk
    ? {cat:'',unit:'PCS',pw:'',gw:'',sp:'',cp:'',stock:'',disc:'',bs:false,isNew:false}
    : {name:one.name, upc:one.upc||'', cat:one.cat||'', unit:one.unit||'PCS',
       pw:one.pw??'', gw:one.gw??'', sp:one.sp??'', cp:one.cp??'',
       stock:one.stock??0, disc:one.disc??0, bs:!!one.bs, isNew:!!one.isNew, img:one.img||''});
  const set = (k,v)=>setF(p=>({...p,[k]:v}));

  async function handleImg(e){
    const file=e.target.files[0]; if(!file) return;
    setImgBusy(true);
    try{
      let up=file;
      if(cutBg){ const r=await removeBackground(file); up=r.file; }
      set('img', await uploadToBucket('product-images', up));
    }catch(err){ alert(err.message); }
    finally{ setImgBusy(false); e.target.value=''; }
  }

  async function save(){
    if(busy||imgBusy) return;
    const patch={};
    if(bulk){
      if(on.cat){ if(!f.cat){alert('Pick a category.');return;} patch.category=f.cat; }
      if(on.unit)  patch.unit          = f.unit;
      if(on.pw)    patch.pack_weight   = +f.pw    || 0;
      if(on.gw)    patch.gross_weight  = +f.gw    || 0;
      if(on.sp)    patch.selling_price = +f.sp    || 0;
      if(on.cp)    patch.cost_price    = +f.cp    || 0;
      if(on.disc){ patch.discount = +f.disc || 0; patch.on_offer = (+f.disc||0) > 0; }
      if(on.bs)    patch.best_seller   = !!f.bs;
      if(on.isNew) patch.is_new        = !!f.isNew;
      if(Object.keys(patch).length===0){ alert('Tick at least one field to change.'); return; }
    } else {
      if(!f.name||!f.cat||f.sp===''||f.pw===''||f.gw===''){
        alert('Name, Category, Packed Weight, Gross Weight and Selling Price are all required.'); return;
      }
      Object.assign(patch, toDbProduct({
        ...f, pw:+f.pw, gw:+f.gw, sp:+f.sp, cp:+f.cp||0,
        stock:+f.stock||0, disc:+f.disc||0, offer:(+f.disc||0)>0,
      }));
      // Stock is derived from inventory by the database — never overwrite it here.
      delete patch.stock;
    }
    setBusy(true);
    // .select() makes the database report what it actually changed, rather than us
    // assuming it worked and updating the screen for nothing.
    const { data, error } = await supabase.from('products').update(patch).in('id', items.map(i=>i.id)).select();
    setBusy(false);
    if(error){ alert('Could not save:\n\n'+error.message); return; }
    if(!data||data.length===0){ alert('The database updated 0 rows. Check your admin permissions.'); return; }
    onSaved(data.map(fromDbProduct));
    onClose();
  }

  // In bulk mode every field gets a tick-box; in single mode it's just the field.
  const W = (k,label,node)=> bulk ? <BulkField on={on} setOn={setOn} k={k} label={label}>{node}</BulkField> : node;
  const YN = [{v:'yes',l:'Yes'},{v:'no',l:'No'}];

  return (
    <Overlay title={bulk?`Edit ${items.length} Products`:`Edit — ${one.name}`} onClose={onClose} width={660}>
      {bulk&&(
        <div style={{background:G.gl,border:`1px solid ${G.g}`,borderRadius:9,padding:11,marginBottom:14,fontSize:11,color:G.tx,lineHeight:1.6}}>
          <b style={{color:G.gd}}>Bulk edit — {items.length} products selected.</b><br/>
          Tick a field to change it on all of them. Anything left unticked is <b>not touched</b>.
          <div style={{marginTop:4,color:G.mut}}>{items.map(i=>i.name).join(' · ')}</div>
        </div>
      )}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 12px'}}>
        {!bulk&&<FInput label="Product Name" value={f.name} onChange={v=>set('name',v)} req/>}
        {!bulk&&<FInput label="UPC/Barcode" value={f.upc} onChange={v=>set('upc',v)}/>}
        {W('cat',  'Category',            <FSel   label={bulk?'':'Category'}            value={f.cat}   onChange={v=>set('cat',v)}   options={cats}/>)}
        {W('unit', 'Unit',                <FSel   label={bulk?'':'Unit'}                value={f.unit}  onChange={v=>set('unit',v)}  options={['PCS','KG','BOX','BOTTLE','PACK']}/>)}
        {W('pw',   'Packed Weight (g)',   <FInput label={bulk?'':'Packed Weight (g)'}   value={f.pw}    onChange={v=>set('pw',v)}    type="number" req={!bulk}/>)}
        {W('gw',   'Gross Weight (KG)',   <FInput label={bulk?'':'Gross Weight (KG)'}   value={f.gw}    onChange={v=>set('gw',v)}    type="number" req={!bulk}/>)}
        {W('sp',   'Selling Price (RMB)', <FInput label={bulk?'':'Selling Price (RMB)'} value={f.sp}    onChange={v=>set('sp',v)}    type="number" req={!bulk}/>)}
        {W('cp',   'Cost Price (RMB)',    <FInput label={bulk?'':'Cost Price (RMB)'}    value={f.cp}    onChange={v=>set('cp',v)}    type="number"/>)}
        {!bulk && <StockReadout value={f.stock} note={`Total across all inventory batches for ${one.name}. Change it by adding or editing batches in the Inventory tab.`}/>}
        {W('disc', 'Discount (%)',        <FInput label={bulk?'':'Discount (%)'}        value={f.disc}  onChange={v=>set('disc',v)}  type="number"/>)}
        {bulk&&W('bs',    '⭐ Best Seller',  <FSel label="" value={f.bs?'yes':'no'}    onChange={v=>set('bs',    v==='yes')} options={YN}/>)}
        {bulk&&W('isNew', '✨ New Arrival',  <FSel label="" value={f.isNew?'yes':'no'} onChange={v=>set('isNew', v==='yes')} options={YN}/>)}
      </div>

      <div style={{fontSize:10,color:G.mut,marginTop:-2,marginBottom:8}}>
        Setting a discount above 0 automatically marks the product as “On Offer”.
        Stock is the number the shop sells against — change it only to correct a miscount.
      </div>

      {!bulk&&(
        <>
          <div style={{display:'flex',gap:20,margin:'4px 0 12px'}}>
            <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12,cursor:'pointer',color:G.tx}}>
              <input type="checkbox" checked={!!f.bs} onChange={e=>set('bs',e.target.checked)}/> ⭐ Best Seller
            </label>
            <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12,cursor:'pointer',color:G.tx}}>
              <input type="checkbox" checked={!!f.isNew} onChange={e=>set('isNew',e.target.checked)}/> ✨ New Arrival
            </label>
          </div>
          <div style={{marginBottom:8}}>
            <div style={{fontSize:11,fontWeight:'600',marginBottom:5,color:G.tx}}>Product Picture</div>
            <input type="file" accept="image/*" onChange={handleImg} disabled={imgBusy} style={{fontSize:12}}/>
            <label style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:G.tx,marginTop:7,cursor:imgBusy?'not-allowed':'pointer'}}>
              <input type="checkbox" checked={cutBg} disabled={imgBusy} onChange={e=>setCutBg(e.target.checked)}/>
              <span>Remove the plain background <span style={{color:G.mut}}>(best for products shot on white)</span></span>
            </label>
            {imgBusy&&<div style={{fontSize:11,color:G.bd,marginTop:6,fontWeight:'bold'}}>⏳ Processing and uploading…</div>}
            {f.img&&!imgBusy&&<div style={{marginTop:8,width:96,height:96,borderRadius:8,border:`1px solid ${G.brd}`,...CHECKER,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}><img src={f.img} alt="Product preview" style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain'}}/></div>}
            <div style={{fontSize:10,color:G.mut,marginTop:5}}>Leave this alone to keep the current picture.</div>
          </div>
        </>
      )}

      <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:14}}>
        <Btn v='outline' onClick={onClose}>Cancel</Btn>
        <Btn onClick={save} disabled={busy||imgBusy}>{busy?'Saving…':'Save Changes'}</Btn>
      </div>
    </Overlay>
  );
}

// Edit one inventory batch, or many at once.
function InvEditOverlay({items,cats,prods,setProds,onClose,onSaved,reloadProducts}) {
  const bulk = items.length > 1;
  const one  = items[0];
  const [on,setOn]     = useState({});
  const [busy,setBusy] = useState(false);
  const [f,setF] = useState(bulk
    ? {cat:'',qty:'',exp:'',sp:'',cp:'',pw:''}
    : {name:one.name, cat:one.cat||'', qty:one.qty??'', exp:one.exp||'',
       sp:one.sp??'', cp:one.cp??'', pw:one.pw??'', upc:one.upc||'', date:one.date||''});
  const set = (k,v)=>setF(p=>({...p,[k]:v}));

  async function save(){
    if(busy) return;
    const patch={};
    // How each product's stock has to move. products.stock is the number the shop
    // actually sells against, so changing a batch's quantity must move it too —
    // otherwise the shelf and the shop would disagree.
    const deltas={};

    if(bulk){
      if(on.cat){ if(!f.cat){alert('Pick a category.');return;} patch.category=f.cat; }
      if(on.exp) patch.expiry_date   = f.exp || null;
      if(on.sp)  patch.selling_price = +f.sp || 0;
      if(on.cp)  patch.cost_price    = +f.cp || 0;
      if(on.pw)  patch.pack_weight   = +f.pw || 0;
      if(on.qty){
        const nq = +f.qty || 0;
        if(nq < 0){ alert('Quantity cannot be negative.'); return; }
        patch.qty = nq;
        items.forEach(it=>{ deltas[it.name] = (deltas[it.name]||0) + (nq - (+it.qty||0)); });
      }
      if(Object.keys(patch).length===0){ alert('Tick at least one field to change.'); return; }
    } else {
      if(!f.name || f.qty===''){ alert('Product Name and Qty are required.'); return; }
      const nq = +f.qty || 0;
      if(nq < 0){ alert('Quantity cannot be negative.'); return; }
      // If the name now matches a product, re-link the batch to it.
      const matched = findProductForBatch(prods, {name:f.name, pw:f.pw, upc:f.upc});
      patch.product_id    = matched ? matched.id : null;
      patch.name          = f.name;
      patch.category      = f.cat || null;
      patch.qty           = nq;
      patch.expiry_date   = f.exp || null;
      patch.selling_price = +f.sp || 0;
      patch.cost_price    = +f.cp || 0;
      patch.pack_weight   = +f.pw || 0;
      patch.upc           = f.upc || null;
      if(f.date) patch.date = f.date;
      // The units leave the old product and land on the new one. If the name didn't
      // change, these two cancel out into a simple difference.
      deltas[one.name] = (deltas[one.name]||0) - (+one.qty||0);
      deltas[f.name]   = (deltas[f.name]  ||0) + nq;
    }

    setBusy(true);
    const { data, error } = await supabase.from('inventory').update(patch).in('id', items.map(i=>i.id)).select();
    if(error){ setBusy(false); alert('Could not save:\n\n'+error.message); return; }
    if(!data||data.length===0){ setBusy(false); alert('The database updated 0 rows. Check your admin permissions.'); return; }

    // Editing a batch's quantity moves stock automatically through the trigger.
    if(reloadProducts) await reloadProducts();
    setBusy(false);
    onSaved(data.map(fromDbInv));
    onClose();
  }

  const W = (k,label,node)=> bulk ? <BulkField on={on} setOn={setOn} k={k} label={label}>{node}</BulkField> : node;
  const qtyDelta = (!bulk && f.qty!=='') ? (+f.qty||0) - (+one.qty||0) : 0;

  return (
    <Overlay title={bulk?`Edit ${items.length} Inventory Batches`:`Edit Batch — ${one.name}`} onClose={onClose} width={660}>
      {bulk&&(
        <div style={{background:G.gl,border:`1px solid ${G.g}`,borderRadius:9,padding:11,marginBottom:14,fontSize:11,color:G.tx,lineHeight:1.6}}>
          <b style={{color:G.gd}}>Bulk edit — {items.length} batches selected.</b><br/>
          Tick a field to change it on all of them. Anything left unticked is <b>not touched</b>.
          <div style={{marginTop:4,color:G.mut}}>Changing Qty sets every selected batch to that number, and moves each product's stock to match.</div>
        </div>
      )}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 12px'}}>
        {!bulk&&<FInput label="Product Name" value={f.name} onChange={v=>set('name',v)} req/>}
        {!bulk&&<FInput label="Date Received" value={f.date} onChange={v=>set('date',v)} type="date"/>}
        {W('cat','Category',            <FSel   label={bulk?'':'Category'}            value={f.cat} onChange={v=>set('cat',v)} options={cats}/>)}
        {W('qty','Quantity',            <FInput label={bulk?'':'Quantity'}            value={f.qty} onChange={v=>set('qty',v)} type="number" req={!bulk}/>)}
        {W('exp','Expiry Date',         <FInput label={bulk?'':'Expiry Date'}         value={f.exp} onChange={v=>set('exp',v)} type="date"/>)}
        {W('sp', 'Selling Price (RMB)', <FInput label={bulk?'':'Selling Price (RMB)'} value={f.sp}  onChange={v=>set('sp',v)}  type="number"/>)}
        {W('cp', 'Cost Price (RMB)',    <FInput label={bulk?'':'Cost Price (RMB)'}    value={f.cp}  onChange={v=>set('cp',v)}  type="number"/>)}
        {W('pw', 'Packed Weight (g)',   <FInput label={bulk?'':'Packed Weight (g)'}   value={f.pw}  onChange={v=>set('pw',v)}  type="number"/>)}
        {!bulk&&<FInput label="UPC/Barcode" value={f.upc} onChange={v=>set('upc',v)}/>}
      </div>

      {!bulk&&qtyDelta!==0&&(
        <div style={{background:qtyDelta>0?G.gl:'#FFF3E0',border:`1px solid ${qtyDelta>0?G.g:G.yd}`,borderRadius:8,padding:10,marginBottom:10,fontSize:12,color:G.tx}}>
          Quantity {qtyDelta>0?'up':'down'} by <b>{Math.abs(qtyDelta)}</b> — the stock count for “{f.name}” will change by <b>{qtyDelta>0?'+':''}{qtyDelta}</b> when you save.
        </div>
      )}
      {!bulk&&f.name!==one.name&&(
        <div style={{background:'#FFF3E0',border:`1px solid ${G.yd}`,borderRadius:8,padding:10,marginBottom:10,fontSize:12,color:G.tx}}>
          You've renamed this batch. Its {one.qty} unit(s) will move off “{one.name}” and onto “{f.name}”.
        </div>
      )}

      <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:10}}>
        <Btn v='outline' onClick={onClose}>Cancel</Btn>
        <Btn onClick={save} disabled={busy}>{busy?'Saving…':'Save Changes'}</Btn>
      </div>
    </Overlay>
  );
}

function ProdTab({prods,setProds,cats,setCats,catColors,setCatColors,inv,setInv,orders,sales}) {
  const [q,setQ]=useState('');
  const [sel,setSel]=useState([]);
  const [showAdd,setShowAdd]=useState(false);
  const [showCatMgr,setShowCatMgr]=useState(false);
  const [discMode,setDiscMode]=useState(false);
  const [discPct,setDiscPct]=useState(10);
  const [conf,setConf]=useState(null);
  const [delBusy,setDelBusy]=useState(false);
  const [editing,setEditing]=useState(null);   // array of products being edited
  const [np,setNp]=useState({name:'',upc:'',cat:'',unit:'PCS',pw:'',gw:'',sp:'',cp:'',stock:0,disc:0,img:''});
  // products.stock is the single source of truth now. This used to override the
  // displayed stock with the sum of inventory batches, which disagreed with reality
  // as soon as a customer bought something.
  const synced=prods;
  const list=useMemo(()=>{
    let r=synced;
    if(q){const lq=q.toLowerCase();r=r.filter(p=>p.name.toLowerCase().includes(lq)||(p.upc||'').includes(lq));}
    return [...r].sort((a,b)=>{const ca=cats.indexOf(a.cat),cb=cats.indexOf(b.cat); if(ca!==cb) return ca-cb; return a.name.localeCompare(b.name);});
  },[synced,q,cats]);
  const [imgBusy,setImgBusy]=useState(false);
  const [cutBg,setCutBg]=useState(true);
  const [imgNote,setImgNote]=useState('');
  // Product pictures go to Supabase Storage and we keep only the URL. They used to
  // be stored as base64 inside products.image_url, which meant every product fetch
  // dragged the full image bytes across the network.
  // With "remove background" ticked, the plain white backdrop is stripped out first
  // and the empty margin cropped away, so the product sits cleanly on any colour.
  async function handleImg(e){
    const f=e.target.files[0]; if(!f) return;
    setImgBusy(true); setImgNote('');
    try{
      let file=f, note='';
      if(cutBg){
        const res=await removeBackground(f);
        file=res.file;
        note=res.removed
          ? 'Background removed. The product will sit cleanly on any colour.'
          : 'No plain backdrop was found, so the photo was uploaded unchanged.';
      }
      const url=await uploadToBucket('product-images', file);
      setNp(p=>({...p,img:url}));
      setImgNote(note);
    }catch(err){ alert(err.message); }
    finally{ setImgBusy(false); e.target.value=''; }
  }
  async function addProd(){
    if(!np.name||!np.cat||!np.sp||!np.pw||!np.gw){alert('Name, Category, Packed Weight, Gross Weight and Selling Price are required');return;}
    if(!np.img){alert('Please upload a product picture');return;}
    if(imgBusy){alert('Please wait for the image to finish uploading.');return;}
    const draft={...np,pw:+np.pw,gw:+np.gw,sp:+np.sp,cp:+np.cp||0,stock:+np.stock||0,disc:+np.disc||0,offer:+np.disc>0,bs:false,isNew:true};
    // Stock is owned by inventory; a new product starts empty and is raised by
    // adding batches. Force 0 here so the form can't set an out-of-thin-air number.
    const dbProduct = { ...toDbProduct(draft), stock: 0 };
    const { data, error } = await supabase.from('products').insert(dbProduct).select().single();
    if(error){alert('Failed to save product: '+error.message);return;}
    setProds(p=>[...p, fromDbProduct(data)]);
    setNp({name:'',upc:'',cat:'',unit:'PCS',pw:'',gw:'',sp:'',cp:'',stock:0,disc:0,img:''});setShowAdd(false);
  }
  // Work out what deleting the selected products will actually touch, so the
  // confirmation can say so plainly instead of the admin finding out afterwards.
  function deleteImpact(){
    const picked = prods.filter(p=>sel.includes(p.id));
    const names  = picked.map(p=>p.name);
    const hit    = (it)=> (it.pid && sel.includes(it.pid)) || names.includes(it.name);
    const nOrders  = (orders||[]).filter(o=>(o.items||[]).some(hit)).length;
    const nSales   = (sales ||[]).filter(s=>(s.items||[]).some(hit)).length;
    const batches  = (inv   ||[]).filter(i=>names.includes(i.name));
    const units    = batches.reduce((sum,i)=>sum+(+i.qty||0),0);
    return { names, nOrders, nSales, nBatches: batches.length, units };
  }

  async function doDelete(){
    if(delBusy) return;
    setDelBusy(true);
    try{
      // .select() forces the database to report exactly which rows it removed.
      // Without it, a delete that RLS quietly refuses looks like a success: the row
      // would disappear from the screen and come back on the next page refresh.
      const { data, error } = await supabase.from('products').delete().in('id', sel).select();

      if(error){
        // The most common failure is a foreign key: the product is still referenced
        // by an order, a sale, or an inventory batch. Say so in plain English.
        const fk = /foreign key constraint/i.test(error.message||'');
        alert(fk
          ? 'The database would not delete this product because other records still point at it.\n\n'
            + 'Run the "product delete" SQL in Supabase (step 9) — it tells the database to keep your order and sales history while letting the product go.\n\n'
            + 'Details: ' + error.message
          : 'Could not delete:\n\n' + error.message);
        return;
      }

      if(!data || data.length===0){
        alert('The database removed 0 rows.\n\nThat usually means the products table has no DELETE policy for admins.');
        return;
      }

      const goneIds   = data.map(d=>d.id);
      const goneNames = data.map(d=>d.name);
      setProds(p=>p.filter(x=>!goneIds.includes(x.id)));
      // Inventory batches for these products are removed by the database (cascade),
      // so clear them from the screen too rather than leaving ghosts behind.
      if(setInv) setInv(p=>p.filter(i=>!goneNames.includes(i.name)));
      setSel([]); setConf(null);
    } finally { setDelBusy(false); }
  }
  async function applyDisc(){
    const { error } = await supabase.from('products').update({ discount: discPct, on_offer: discPct>0 }).in('id', sel);
    if(error){alert('Failed to apply discount: '+error.message);return;}
    setProds(p=>p.map(x=>sel.includes(x.id)?{...x,disc:discPct,offer:discPct>0}:x));setSel([]);setDiscMode(false);
  }
  async function removeDisc(){
    const { error } = await supabase.from('products').update({ discount: 0, on_offer: false }).in('id', sel);
    if(error){alert('Failed to remove discount: '+error.message);return;}
    setProds(p=>p.map(x=>sel.includes(x.id)?{...x,disc:0,offer:false}:x));setSel([]);setDiscMode(false);
  }
  function tog(id){setSel(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);}
  const allSel = list.length>0 && list.every(p=>sel.includes(p.id));
  function toggleAll(){ setSel(allSel ? [] : list.map(p=>p.id)); }
  return(
    <div>
      {conf&&<ConfirmDlg msg={conf.msg} onYes={conf.yes} onNo={()=>setConf(null)}/>}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:8}}>
        <div style={{fontSize:19,fontWeight:'bold',color:G.dk}}>📋 Product List</div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          <Btn onClick={()=>setShowAdd(true)}>+ Add Product</Btn>
          <Btn v='info' sm onClick={()=>setShowCatMgr(true)}>🎨 Categories</Btn>
          {sel.length>0&&<Btn v='info' sm onClick={()=>setEditing(prods.filter(p=>sel.includes(p.id)))}>✏️ Edit ({sel.length})</Btn>}
          {sel.length>0&&!discMode&&<Btn v='warn' sm onClick={()=>setDiscMode(true)}>% Discount</Btn>}
          {discMode&&sel.length>0&&<><input type="number" value={discPct} onChange={e=>setDiscPct(+e.target.value)} style={{width:55,padding:'4px 6px',borderRadius:5,border:`1px solid ${G.brd}`,fontSize:12}}/><Btn v='warn' sm onClick={applyDisc}>Apply</Btn><Btn v='danger' sm onClick={removeDisc}>Remove</Btn><Btn v='outline' sm onClick={()=>{setDiscMode(false);setSel([]);}}>Cancel</Btn></>}
          {sel.length>0&&<Btn v='danger' sm disabled={delBusy} onClick={()=>{
            const im = deleteImpact();
            let m = `Delete ${sel.length} product(s)?\n\n${im.names.join(', ')}`;
            const notes = [];
            if(im.units>0)    notes.push(`• ${im.units} unit(s) across ${im.nBatches} inventory batch(es) will be deleted with it.`);
            if(im.nOrders>0)  notes.push(`• Appears in ${im.nOrders} customer order(s). That history is KEPT — the name and price stay on the order.`);
            if(im.nSales>0)   notes.push(`• Appears in ${im.nSales} sales record(s). That history is KEPT too.`);
            if(notes.length)  m += '\n\n' + notes.join('\n');
            m += '\n\nThis cannot be undone.';
            setConf({msg:m, yes:doDelete});
          }}>🗑️ Delete ({sel.length})</Btn>}
        </div>
      </div>
      <div style={{display:'flex',gap:8,marginBottom:14}}>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by name or UPC/barcode..." style={{flex:1,padding:'9px 12px',borderRadius:8,border:`1px solid ${G.brd}`,fontSize:13}}/>
        {q&&<Btn v='outline' sm onClick={()=>setQ('')}>Clear</Btn>}
      </div>
      <div style={{overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth:950}}>
          <thead><tr style={{background:G.gd,color:G.w}}>
            <th style={{padding:'9px 7px',textAlign:'center'}}><input type="checkbox" checked={allSel} onChange={toggleAll}/></th>
            {['S.No','Picture','Product Name','UPC/Barcode','Category','Unit','Packed (g)','Gross (KG)','Sell (RMB)','Cost (RMB)','Stock','Discount','Edit'].map(h=>(
              <th key={h} style={{padding:'9px 7px',textAlign:'center',whiteSpace:'nowrap'}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{list.map((p,i)=>{const isS=sel.includes(p.id);return(
            <tr key={p.id} style={{background:isS?G.gl:i%2===0?G.w:G.bg,borderBottom:`1px solid ${G.brd}`}}>
              <td style={{padding:'7px',textAlign:'center'}}><input type="checkbox" checked={isS} onChange={()=>tog(p.id)}/></td>
              {/* Running serial number that always follows the current sort/filter,
                  so it stays 1,2,3… even after products are added or deleted.
                  The real database id is kept underneath in grey, since orders and
                  inventory still reference it. */}
              <td style={{padding:'7px',textAlign:'center',fontWeight:'bold'}}>{i+1}<div style={{fontSize:9,color:G.mut,fontWeight:'normal'}}>#{p.id}</div></td>
              <td style={{padding:'7px',textAlign:'center'}}>{p.img?<img src={p.img} alt={p.name} loading="lazy" decoding="async" style={{width:40,height:40,objectFit:'contain',borderRadius:6}}/>:<span style={{fontSize:24}}>{ICONS[p.cat]||'📦'}</span>}</td>
              <td style={{padding:'7px'}}><div style={{fontWeight:'bold'}}>{p.name}</div>{p.offer&&<span style={{background:'#FFCDD2',color:'#B71C1C',borderRadius:4,padding:'1px 5px',fontSize:10,fontWeight:'bold'}}>On Offer</span>}</td>
              <td style={{padding:'7px',textAlign:'center',color:G.mut,fontSize:11}}>{p.upc||'—'}</td>
              <td style={{padding:'7px',textAlign:'center'}}><CatChip cat={p.cat} catColors={catColors}/></td>
              <td style={{padding:'7px',textAlign:'center'}}>{p.unit}</td>
              <td style={{padding:'7px',textAlign:'center'}}>{p.pw}</td>
              <td style={{padding:'7px',textAlign:'center'}}>{p.gw}</td>
              <td style={{padding:'7px',textAlign:'center'}}>{p.offer?<><div style={{textDecoration:'line-through',color:G.mut,fontSize:10}}>¥{p.sp}</div><div style={{color:'#B71C1C',fontWeight:'bold'}}>¥{ep(p).toFixed(2)}</div></>:<span>¥{p.sp}</span>}</td>
              <td style={{padding:'7px',textAlign:'center'}}>{p.cp?`¥${p.cp}`:'—'}</td>
              <td style={{padding:'7px',textAlign:'center'}}><span style={{...stStyle(p.stock),padding:'2px 8px',borderRadius:5,display:'inline-block'}}>{p.stock}</span></td>
              <td style={{padding:'7px',textAlign:'center'}}>{p.disc>0?<span style={{color:'#B71C1C',fontWeight:'bold'}}>{p.disc}%</span>:'—'}</td>
              <td style={{padding:'7px',textAlign:'center'}}><button onClick={()=>setEditing([p])} title={`Edit ${p.name}`} style={{background:'none',border:'none',cursor:'pointer',fontSize:15,lineHeight:1}}>✏️</button></td>
            </tr>
          );})}</tbody>
        </table>
        {list.length===0&&<div style={{textAlign:'center',padding:40,color:G.mut}}>No products found</div>}
      </div>
      {showAdd&&(
        <Overlay title="Add New Product" onClose={()=>setShowAdd(false)} width={640}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <FInput label="Product Name *" value={np.name} onChange={v=>setNp(p=>({...p,name:v}))} req/>
            <FInput label="UPC/Barcode" value={np.upc} onChange={v=>setNp(p=>({...p,upc:v}))}/>
            <FSel label="Category *" value={np.cat} onChange={v=>setNp(p=>({...p,cat:v}))} options={cats}/>
            <FSel label="Unit *" value={np.unit} onChange={v=>setNp(p=>({...p,unit:v}))} options={['PCS','KG','BOX','BOTTLE','PACK']}/>
            <FInput label="Packed Weight (g) *" value={np.pw} onChange={v=>setNp(p=>({...p,pw:v}))} type="number" req/>
            <FInput label="Gross Weight (KG) *" value={np.gw} onChange={v=>setNp(p=>({...p,gw:v}))} type="number" req/>
            <FInput label="Selling Price (RMB) *" value={np.sp} onChange={v=>setNp(p=>({...p,sp:v}))} type="number" req/>
            <FInput label="Cost Price (RMB)" value={np.cp} onChange={v=>setNp(p=>({...p,cp:v}))} type="number"/>
            <StockReadout value={0} note="New products start at 0. Add an inventory batch to set the stock."/>
            <FInput label="Discount (%)" value={np.disc} onChange={v=>setNp(p=>({...p,disc:v}))} type="number"/>
          </div>
          <div style={{marginTop:6,marginBottom:6}}>
            <div style={{fontSize:11,fontWeight:'600',marginBottom:5}}>Product Picture <span style={{color:'#B71C1C'}}>*</span> <span style={{color:G.mut,fontWeight:'normal'}}>(required)</span></div>
            <input type="file" accept="image/*" onChange={handleImg} disabled={imgBusy} style={{fontSize:12}}/>
            <label style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:G.tx,marginTop:7,cursor:imgBusy?'not-allowed':'pointer'}}>
              <input type="checkbox" checked={cutBg} disabled={imgBusy} onChange={e=>setCutBg(e.target.checked)}/>
              <span>Remove the plain background <span style={{color:G.mut}}>(best for products shot on white)</span></span>
            </label>
            {imgBusy&&<div style={{fontSize:11,color:G.bd,marginTop:6,fontWeight:'bold'}}>⏳ Processing and uploading…</div>}
            {imgNote&&!imgBusy&&<div style={{fontSize:11,color:G.gd,marginTop:6}}>{imgNote}</div>}
            {np.img&&!imgBusy&&<div style={{marginTop:8,width:96,height:96,borderRadius:8,border:`1px solid ${G.brd}`,...CHECKER,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}><img src={np.img} alt="Product preview" style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain'}}/></div>}
          </div>
          <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:14}}><Btn v='outline' onClick={()=>setShowAdd(false)}>Cancel</Btn><Btn onClick={addProd}>Save Product</Btn></div>
        </Overlay>
      )}
      {editing&&<ProdEditOverlay items={editing} cats={cats} onClose={()=>setEditing(null)}
        onSaved={updated=>{ setProds(p=>p.map(x=>{const u=updated.find(y=>y.id===x.id); return u?{...x,...u}:x;})); setSel([]); }}/>}
      {showCatMgr&&<CatManageOverlay cats={cats} setCats={setCats} catColors={catColors} setCatColors={setCatColors} prods={prods} onClose={()=>setShowCatMgr(false)}/>}
    </div>
  );
}

function InvTab({inv,setInv,prods,setProds,cats,catColors,delInv,setDelInv,reloadProducts}) {
  const [q,setQ]=useState('');
  const [sel,setSel]=useState([]);
  const [showAdd,setShowAdd]=useState(false);
  const [srch,setSrch]=useState('');
  const [conf,setConf]=useState(null);
  const [editing,setEditing]=useState(null);   // array of batches being edited
  const [ni,setNi]=useState({name:'',cat:'',qty:'',exp:'',sp:'',cp:'',pw:'',upc:''});
  const baseList=useMemo(()=>{
    let r=inv;
    if(q){const lq=q.toLowerCase(); r=r.filter(i=>i.name.toLowerCase().includes(lq)||(i.upc||'').includes(lq));}
    return [...r].sort((a,b)=>{
      const ca=cats.indexOf(a.cat),cb=cats.indexOf(b.cat);
      if(ca!==cb) return ca-cb;
      if(a.name!==b.name) return a.name.localeCompare(b.name);
      return new Date(a.exp)-new Date(b.exp);
    });
  },[inv,q,cats]);
  const matching=useMemo(()=>{if(!srch)return[];return prods.filter(p=>p.name.toLowerCase().includes(srch.toLowerCase())||(p.upc||'').includes(srch)).slice(0,8);},[srch,prods]);
  function selProd(p){setNi({name:p.name,cat:p.cat,qty:'',exp:'',sp:p.sp,cp:p.cp||'',pw:p.pw,upc:p.upc||''});setSrch('');}   // clear srch so the dropdown closes
  async function addItem(){
    if(!ni.name||!ni.qty||!ni.exp){alert('Product, quantity and expiry date required');return;}
    const draft={date:bjDate(),ts:bjTime(),...ni,qty:+ni.qty,sp:+ni.sp,cp:+ni.cp,pw:+ni.pw};
    const matchedProd=findProductForBatch(prods, draft);
    const { data, error } = await supabase.from('inventory').insert(toDbInv(draft, matchedProd?.id)).select().single();
    if(error){alert('Failed to save inventory item: '+error.message);return;}
    const item=fromDbInv(data);
    setInv(p=>[...p,item]);
    // The database trigger has already recomputed products.stock from the batches.
    // Re-pull products so the Product List shows the new total.
    if(reloadProducts) await reloadProducts();
    setNi({name:'',cat:'',qty:'',exp:'',sp:'',cp:'',pw:'',upc:''});setSrch('');setShowAdd(false);
  }
  // ----- Fix 5: restore or permanently delete archived items -----
  const [archSel,setArchSel]=useState([]);
  const [archBusy,setArchBusy]=useState(false);
  function toggleArch(id){setArchSel(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);}

  // Puts archived rows back into `inventory` and recalculates the product's stock.
  async function restoreArchived(){
    if(archSel.length===0) return;
    if(!window.confirm(`Restore ${archSel.length} item(s) back into inventory?`)) return;
    setArchBusy(true);
    try{
      const rows=delInv.filter(d=>archSel.includes(d.archiveId));
      const toInsert=rows.map(d=>{
        const prod=findProductForBatch(prods, d);
        return {
          product_id: prod?prod.id:null, date: d.date, time: d.time, name: d.name,
          category: d.cat, qty: d.qty, expiry_date: d.exp || null,
          selling_price: d.sp, cost_price: d.cp, pack_weight: d.pw, upc: d.upc || null,
        };
      });
      const { data: newRows, error: insErr } = await supabase.from('inventory').insert(toInsert).select();
      if(insErr){alert('Failed to restore: '+insErr.message);return;}
      const restored=(newRows||[]).map(fromDbInv);
      setInv([...inv,...restored]);

      // Stock recomputes itself from the restored batches via the trigger.
      if(reloadProducts) await reloadProducts();

      const { error: delErr } = await supabase.from('inventory_archive').delete().in('id', archSel);
      if(delErr) console.error('Archive cleanup failed:', delErr.message);
      setDelInv(p=>p.filter(d=>!archSel.includes(d.archiveId)));
      setArchSel([]);
    } finally { setArchBusy(false); }
  }

  // Permanently deletes archived rows. There is no undo.
  async function purgeArchived(){
    if(archSel.length===0) return;
    if(!window.confirm(`Permanently delete ${archSel.length} item(s)? This CANNOT be undone.`)) return;
    setArchBusy(true);
    try{
      const { error } = await supabase.from('inventory_archive').delete().in('id', archSel);
      if(error){alert('Failed to delete: '+error.message);return;}
      setDelInv(p=>p.filter(d=>!archSel.includes(d.archiveId)));
      setArchSel([]);
    } finally { setArchBusy(false); }
  }

  async function doRemove(){
    const toRm=inv.filter(i=>sel.includes(i.id));
    const archived=toRm.map(x=>({...x,deletedAt:`${bjDate()} ${bjTime()}`}));
    // .select() so we get back the archive row IDs — we need them to restore/purge later
    const { data: archRows, error: archErr } = await supabase
      .from('inventory_archive').insert(archived.map(a=>({original_data:a}))).select();
    if(archErr){alert('Failed to archive removed items: '+archErr.message);return;}
    const { error: delErr } = await supabase.from('inventory').delete().in('id', sel);
    if(delErr){alert('Failed to remove: '+delErr.message);return;}
    const withIds=(archRows||[]).map(r=>({...r.original_data, archiveId:r.id}));
    setDelInv(p=>[...withIds,...p]);
    setInv(p=>p.filter(i=>!sel.includes(i.id)));
    // Removing batches lowers stock automatically through the trigger.
    if(reloadProducts) await reloadProducts();
    setSel([]);setConf(null);
  }
  function tog(id){setSel(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);}
  const allSel = baseList.length>0 && baseList.every(i=>sel.includes(i.id));
  function toggleAll(){ setSel(allSel ? [] : baseList.map(i=>i.id)); }
  return(
    <div>
      {conf&&<ConfirmDlg msg={conf.msg} onYes={conf.yes} onNo={()=>setConf(null)}/>}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:8}}>
        <div style={{fontSize:19,fontWeight:'bold',color:G.dk}}>🏭 Inventory</div>
        <div style={{display:'flex',gap:6}}><Btn onClick={()=>setShowAdd(true)}>+ Add Items</Btn>{sel.length>0&&<Btn v='info' onClick={()=>setEditing(inv.filter(i=>sel.includes(i.id)))}>✏️ Edit ({sel.length})</Btn>}{sel.length>0&&<Btn v='danger' onClick={()=>setConf({msg:`Remove ${sel.length} item(s) from inventory?`,yes:doRemove})}>Remove ({sel.length})</Btn>}</div>
      </div>
      <div style={{display:'flex',gap:12,marginBottom:12,flexWrap:'wrap',fontSize:11,alignItems:'center'}}>
        {[{c:'#FFCDD2',l:'Expired'},{c:'#BBDEFB',l:'<3 months'},{c:'#FFF9C4',l:'<6 months'},{c:'#C8E6C9',l:'>1 year'}].map(k=>(
          <div key={k.l} style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:12,height:12,background:k.c,borderRadius:2}}/><span style={{color:G.tx}}>{k.l}</span></div>
        ))}
        <div style={{color:G.mut,fontSize:11,marginLeft:'auto'}}>Sorted by category priority</div>
      </div>
      <div style={{marginBottom:14}}><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by name or UPC..." style={{width:'100%',padding:'9px 12px',borderRadius:8,border:`1px solid ${G.brd}`,fontSize:13,boxSizing:'border-box'}}/></div>
      <div style={{overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth:850}}>
          <thead><tr style={{background:G.gd,color:G.w}}>
            <th style={{padding:'9px 7px',textAlign:'center'}}><input type="checkbox" checked={allSel} onChange={toggleAll}/></th>
            {['SI.','Date','Time','Product Name','Category','Qty','Expiry Date','Sell','Cost','Packed (g)','UPC','Edit'].map(h=>(
              <th key={h} style={{padding:'9px 7px',textAlign:'center',whiteSpace:'nowrap'}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{baseList.map((item,i)=>{const es=expStyle(item.exp);return(
            <tr key={item.id} style={{...es,borderBottom:`1px solid ${G.brd}`}}>
              <td style={{padding:'7px',textAlign:'center'}}><input type="checkbox" checked={sel.includes(item.id)} onChange={()=>tog(item.id)}/></td>
              <td style={{padding:'7px',textAlign:'center',fontWeight:'bold'}}>{i+1}</td>
              <td style={{padding:'7px'}}>{item.date}</td>
              <td style={{padding:'7px',fontSize:10,color:G.mut}}>{item.ts}</td>
              <td style={{padding:'7px',fontWeight:'bold'}}>{item.name}</td>
              <td style={{padding:'7px',textAlign:'center'}}><CatChip cat={item.cat} catColors={catColors}/></td>
              <td style={{padding:'7px',textAlign:'center',fontWeight:'bold'}}>{item.qty}</td>
              <td style={{padding:'7px',textAlign:'center',fontWeight:'bold',fontSize:11}}>{ddmmyyyy(item.exp)}</td>
              <td style={{padding:'7px',textAlign:'center'}}>¥{item.sp}</td>
              <td style={{padding:'7px',textAlign:'center'}}>{item.cp?`¥${item.cp}`:'—'}</td>
              <td style={{padding:'7px',textAlign:'center'}}>{item.pw}</td>
              <td style={{padding:'7px',textAlign:'center',fontSize:10,color:G.mut}}>{item.upc||'—'}</td>
              <td style={{padding:'7px',textAlign:'center'}}><button onClick={()=>setEditing([item])} title={`Edit this batch of ${item.name}`} style={{background:'none',border:'none',cursor:'pointer',fontSize:15,lineHeight:1}}>✏️</button></td>
            </tr>
          );})}</tbody>
        </table>
        {baseList.length===0&&<div style={{textAlign:'center',padding:40,color:G.mut}}>No inventory items</div>}
      </div>
      {delInv.length>0&&(
        <Card style={{marginTop:22}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10,flexWrap:'wrap',gap:8}}>
            <div style={{fontWeight:'bold',fontSize:14,color:'#B71C1C'}}>🗑 Deleted Items (Archive) · {delInv.length}</div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              {archSel.length>0&&<span style={{fontSize:11,color:G.mut}}>{archSel.length} selected</span>}
              <Btn sm v='success' disabled={archSel.length===0||archBusy} onClick={restoreArchived}>↩️ Restore to Inventory</Btn>
              <Btn sm v='danger' disabled={archSel.length===0||archBusy} onClick={purgeArchived}>🔥 Delete Forever</Btn>
            </div>
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,minWidth:640}}>
              <thead><tr style={{background:'#FFEBEE'}}>
                <th style={{padding:'7px',textAlign:'center',width:34}}>
                  <input type="checkbox"
                    checked={archSel.length===delInv.length&&delInv.length>0}
                    onChange={e=>setArchSel(e.target.checked?delInv.map(d=>d.archiveId).filter(Boolean):[])}/>
                </th>
                {['Product Name','Category','Qty','Expiry Date','UPC','Deleted At'].map(h=><th key={h} style={{padding:'7px',textAlign:'center'}}>{h}</th>)}
              </tr></thead>
              <tbody>{delInv.map((d,i)=>{
                const isSel=archSel.includes(d.archiveId);
                return(
                <tr key={d.archiveId||i} style={{borderBottom:`1px solid ${G.brd}`,opacity:isSel?1:0.8,background:isSel?G.gl:'transparent'}}>
                  <td style={{padding:'6px',textAlign:'center'}}>
                    <input type="checkbox" disabled={!d.archiveId} checked={isSel} onChange={()=>toggleArch(d.archiveId)}/>
                  </td>
                  <td style={{padding:'6px',textAlign:'center'}}>{d.name}</td>
                  <td style={{padding:'6px',textAlign:'center'}}><CatChip cat={d.cat} catColors={catColors}/></td>
                  <td style={{padding:'6px',textAlign:'center'}}>{d.qty}</td>
                  <td style={{padding:'6px',textAlign:'center'}}>{d.exp}</td>
                  <td style={{padding:'6px',textAlign:'center',color:G.mut}}>{d.upc||'—'}</td>
                  <td style={{padding:'6px',textAlign:'center',color:G.mut}}>{d.deletedAt}</td>
                </tr>
              );})}</tbody>
            </table>
          </div>
          <div style={{fontSize:10,color:G.mut,marginTop:8}}>Restoring puts the batch back into inventory and adds its quantity to the product's stock. Deleting forever cannot be undone.</div>
        </Card>
      )}
      {editing&&<InvEditOverlay items={editing} cats={cats} prods={prods} setProds={setProds} reloadProducts={reloadProducts} onClose={()=>setEditing(null)}
        onSaved={updated=>{ setInv(p=>p.map(x=>{const u=updated.find(y=>y.id===x.id); return u||x;})); setSel([]); }}/>}
      {showAdd&&(
        <Overlay title="Add Inventory Item" onClose={()=>setShowAdd(false)} width={520}>
          {/* Once a product is picked the search box disappears — you only see the
              chosen product, with a Change button to search again. This stops the
              dropdown lingering over the form after a selection. */}
          {!ni.name ? (
            <div style={{position:'relative',marginBottom:14}}>
              <div style={{fontSize:11,color:G.tx,marginBottom:3,fontWeight:'600'}}>Search Product (name or UPC)</div>
              <input autoFocus value={srch} onChange={e=>setSrch(e.target.value)} placeholder="Type to search..." style={{width:'100%',padding:'8px 11px',borderRadius:7,border:`1px solid ${G.brd}`,fontSize:13,boxSizing:'border-box'}}/>
              {matching.length>0&&(
                <div style={{position:'absolute',top:'100%',left:0,right:0,background:G.w,border:`1px solid ${G.brd}`,borderRadius:8,boxShadow:'0 4px 12px rgba(0,0,0,0.12)',zIndex:100,maxHeight:200,overflow:'auto'}}>
                  {matching.map(p=>(
                    <div key={p.id} onClick={()=>selProd(p)} style={{padding:'9px 12px',cursor:'pointer',fontSize:12,borderBottom:`1px solid ${G.bg}`}}>
                      <div style={{fontWeight:'bold'}}>{p.name}</div>
                      <div style={{color:G.mut,fontSize:11}}>{p.cat} · {p.pw}g{p.upc?' · '+p.upc:''}</div>
                    </div>
                  ))}
                </div>
              )}
              {srch&&matching.length===0&&<div style={{fontSize:11,color:G.mut,marginTop:5}}>No product matches “{srch}”.</div>}
            </div>
          ) : (
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:G.gl,borderRadius:8,padding:'10px 12px',marginBottom:14,gap:10}}>
              <div>
                <div style={{fontWeight:'bold',color:G.gd,fontSize:13}}>{ni.name}</div>
                <div style={{color:G.tx,fontSize:11}}>{ni.cat} · {ni.pw}g{ni.upc?' · '+ni.upc:''}</div>
              </div>
              <Btn sm v='outline' onClick={()=>{setNi({name:'',cat:'',qty:'',exp:'',sp:'',cp:'',pw:'',upc:''});setSrch('');}}>Change</Btn>
            </div>
          )}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <FInput label="Quantity (PCS) *" value={ni.qty} onChange={v=>setNi(p=>({...p,qty:v}))} type="number" req/>
            <div><FInput label="Expiry Date *" value={ni.exp} onChange={v=>setNi(p=>({...p,exp:v}))} type="date" req/>{ni.exp&&<div style={{fontSize:10,color:G.gd,marginTop:-6,marginBottom:8}}>📅 {ddmmyyyy(ni.exp)}</div>}</div>
            <FInput label="Selling Price (RMB)" value={ni.sp} onChange={v=>setNi(p=>({...p,sp:v}))} type="number"/>
            <FInput label="Cost Price (RMB)" value={ni.cp} onChange={v=>setNi(p=>({...p,cp:v}))} type="number"/>
          </div>
          <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:14}}><Btn v='outline' onClick={()=>setShowAdd(false)}>Cancel</Btn><Btn onClick={addItem}>Add to Inventory</Btn></div>
        </Overlay>
      )}
    </div>
  );
}

function PITab({prods,pos,setPOs,catColors}) {
  function blankPIItem(){return {name:'',qty:'',pw:'',uc:'',cat:'',gw:'',us:'',exp:'',sp:'',upc:'',tc:'',ts2:'',ppc:''};}
  const [hdr,setHdr]=useState({cr:'',sr:'',bdc:'',cnc:''});
  const [vendor,setVendor]=useState('');
  const [items,setItems]=useState([blankPIItem()]);
  const [curId,setCurId]=useState(null);
  const poNum=curId?(pos.find(p=>p.id===curId)?.poNum||1):(pos.length>0?Math.max(...pos.map(p=>p.poNum))+1:1);

  function recalc(u){
    const qty=+(u.qty||0),uc=+(u.uc||0),us=+(u.us||0),gw=+(u.gw||0);
    u.tc=(qty*uc).toFixed(2); u.ts2=(us*gw*qty).toFixed(2);
    u.ppc = (qty>0 && +hdr.cr>0) ? ((+u.tc+(+u.ts2))/qty/+hdr.cr).toFixed(2) : '';
    return u;
  }
  function updItem(idx,f,v){
    setItems(prev=>prev.map((it,i)=>{
      if(i!==idx) return it;
      let u={...it,[f]:v};
      if(f==='name'&&v===''){u.pw='';u.cat='';u.gw='';u.upc='';}
      return recalc(u);
    }));
  }
  function selectItem(idx,p){
    setItems(prev=>{
      const next = prev.map((it,i)=> i!==idx ? it : recalc({...it,name:p.name,pw:p.pw,cat:p.cat,gw:p.gw,upc:p.upc||''}));
      return idx===prev.length-1 ? [...next, blankPIItem()] : next;
    });
  }
  const totQty=items.reduce((s,i)=>s+(+i.qty||0),0);
  const totC=items.reduce((s,i)=>s+(+i.tc||0),0);
  const totS=items.reduce((s,i)=>s+(+i.ts2||0),0);
  const chnLC=(+hdr.cnc)*(+hdr.sr)||0;
  const grand=totC+totS+(+hdr.bdc||0)+chnLC;

  async function save(){
    const fi=items.filter(i=>i.name&&i.qty);if(!fi.length){alert('Add at least one product');return;}
    const existing = curId ? pos.find(p=>p.id===curId) : null;
    const draft={poNum,date:existing?existing.date:bjDate(),time:existing?existing.time:bjTime(),vendor,hdr:{...hdr},items:fi,totQty,totC,totS,bdLC:+hdr.bdc||0,chnLC,grand};
    if(curId){
      const { error } = await supabase.from('purchase_orders').update(toDbPO(draft)).eq('id',curId);
      if(error){alert('Failed to save purchase order: '+error.message);return;}
      setPOs(p=>p.map(x=>x.id===curId?{...draft,id:curId}:x));
    } else {
      const { data, error } = await supabase.from('purchase_orders').insert(toDbPO(draft)).select().single();
      if(error){alert('Failed to save purchase order: '+error.message);return;}
      const saved=fromDbPO(data);
      setPOs(p=>[...p,saved]); setCurId(saved.id);
    }
    alert('Purchase order saved!');
  }
  function newOrd(){setHdr({cr:'',sr:'',bdc:'',cnc:''});setVendor('');setItems([blankPIItem()]);setCurId(null);}
  async function deleteOrder(){
    if(!curId){alert('Load or save an order first, or click Load on one below to delete it.');return;}
    const { error } = await supabase.from('purchase_orders').delete().eq('id',curId);
    if(error){alert('Failed to delete: '+error.message);return;}
    const remaining=pos.filter(p=>p.id!==curId).sort((a,b)=>a.poNum-b.poNum).map((p,i)=>({...p,poNum:i+1}));
    await Promise.all(remaining.map(p=>supabase.from('purchase_orders').update({po_num:p.poNum}).eq('id',p.id)));
    setPOs(remaining);
    newOrd();
  }
  function printOrder(){
    const html=buildPOHTML({poNum,date:bjDate(),time:bjTime(),vendor,hdr,items:items.filter(i=>i.name&&i.qty),totQty,totC,totS,bdLC:+hdr.bdc||0,chnLC,grand});
    openPrintWindow(html);
  }
  function loadPO(po){
    setCurId(po.id); setVendor(po.vendor||''); setHdr(po.hdr||{cr:'',sr:'',bdc:'',cnc:''});
    setItems([...(po.items||[]).map(it=>({...it})), blankPIItem()]);
  }

  return(
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:8}}>
        <div style={{fontSize:19,fontWeight:'bold',color:G.dk}}>🧾 Purchase Invoice</div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          <Btn onClick={newOrd}>+ New</Btn>
          <Btn v='info' onClick={save}>💾 Save</Btn>
          <Btn v='outline' onClick={printOrder}>🖨️ Print PDF</Btn>
          <Btn v='danger' onClick={deleteOrder}>🗑️ Delete</Btn>
        </div>
      </div>
      <Card style={{marginBottom:14}}>
        <div style={{fontSize:12,color:G.mut,marginBottom:10,fontWeight:'bold'}}>PO# {poNum} · Date: {bjDate()} · Time: {bjTime()}</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(175px,1fr))',gap:10}}>
          <FInput label="Vendor" value={vendor} onChange={setVendor}/>
          <FInput label="Costing RMB Rate" value={hdr.cr} onChange={v=>setHdr(p=>({...p,cr:v}))} type="number"/>
          <FInput label="Selling RMB Rate" value={hdr.sr} onChange={v=>setHdr(p=>({...p,sr:v}))} type="number"/>
          <FInput label="BD Courier (BDT)" value={hdr.bdc} onChange={v=>setHdr(p=>({...p,bdc:v}))} type="number"/>
          <FInput label="China Courier (RMB)" value={hdr.cnc} onChange={v=>setHdr(p=>({...p,cnc:v}))} type="number"/>
        </div>
      </Card>
      <Card style={{marginBottom:14,overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,minWidth:1050}}>
          <thead><tr style={{background:G.gd,color:G.w}}>
            {['Product Name','Qty','Packed(g)','Unit Cost(BDT)','Total Cost(BDT)','Category','Gross(KG)','Unit Ship(BDT)','Total Ship(BDT)','Expiry','Per Pkt(RMB)','Set Price(RMB)','UPC','✕'].map(h=>(
              <th key={h} style={{padding:'7px 5px',textAlign:'center',whiteSpace:'nowrap'}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{items.map((it,idx)=>(
            <tr key={idx} style={{background:idx%2===0?G.w:G.bg,borderBottom:`1px solid ${G.brd}`}}>
              <td style={{padding:'5px',minWidth:155}}><ComboInput value={it.name} onChange={v=>updItem(idx,'name',v)} onPick={p=>selectItem(idx,p)} options={prods} placeholder="Type to search product..."/></td>
              <td style={{padding:'5px'}}><input type="number" value={it.qty} onChange={e=>updItem(idx,'qty',e.target.value)} style={{width:50,padding:'4px',borderRadius:4,border:`1px solid ${G.brd}`,fontSize:11,textAlign:'center'}}/></td>
              <td style={{padding:'5px',textAlign:'center'}}>{it.pw||'—'}</td>
              <td style={{padding:'5px'}}><input type="number" value={it.uc} onChange={e=>updItem(idx,'uc',e.target.value)} style={{width:65,padding:'4px',borderRadius:4,border:`1px solid ${G.brd}`,fontSize:11}}/></td>
              <td style={{padding:'5px',textAlign:'center',fontWeight:'bold'}}>{it.tc||0}</td>
              <td style={{padding:'5px',textAlign:'center'}}>{it.cat?<CatChip cat={it.cat} catColors={catColors}/>:<span style={{fontSize:10,color:G.mut}}>—</span>}</td>
              <td style={{padding:'5px',textAlign:'center'}}>{it.gw}</td>
              <td style={{padding:'5px'}}><input type="number" value={it.us} onChange={e=>updItem(idx,'us',e.target.value)} style={{width:65,padding:'4px',borderRadius:4,border:`1px solid ${G.brd}`,fontSize:11}}/></td>
              <td style={{padding:'5px',textAlign:'center',fontWeight:'bold'}}>{it.ts2||0}</td>
              <td style={{padding:'5px'}}><input type="date" value={it.exp} onChange={e=>updItem(idx,'exp',e.target.value)} style={{padding:'3px',borderRadius:4,border:`1px solid ${G.brd}`,fontSize:10}}/></td>
              <td style={{padding:'5px',textAlign:'center',color:G.gd,fontWeight:'bold'}}>{it.ppc?`¥${it.ppc}`:'—'}</td>
              <td style={{padding:'5px'}}><input type="number" value={it.sp} onChange={e=>updItem(idx,'sp',e.target.value)} style={{width:60,padding:'4px',borderRadius:4,border:`1px solid ${G.brd}`,fontSize:11}}/></td>
              <td style={{padding:'5px',textAlign:'center',fontSize:10}}>{it.upc}</td>
              <td style={{padding:'5px',textAlign:'center'}}>{items.length>1&&<button onClick={()=>setItems(p=>p.filter((_,j)=>j!==idx))} style={{background:'none',border:'none',cursor:'pointer',color:'#B71C1C',fontSize:14}}>✕</button>}</td>
            </tr>
          ))}</tbody>
        </table>
        <div style={{marginTop:10}}><Btn sm onClick={()=>setItems(p=>[...p,blankPIItem()])}>+ Add Row</Btn></div>
        <div style={{background:G.bg,borderRadius:8,padding:12,marginTop:14,display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:8,fontSize:12}}>
          <div><strong>Total Qty:</strong> {totQty} PCS</div><div><strong>Total Cost:</strong> ৳{totC.toFixed(2)}</div>
          <div><strong>Total Shipping:</strong> ৳{totS.toFixed(2)}</div><div><strong>BD Courier:</strong> ৳{(+hdr.bdc||0).toFixed(2)}</div>
          <div><strong>China Courier:</strong> ৳{chnLC.toFixed(2)}</div>
          <div style={{fontWeight:'bold',color:G.gd,fontSize:14}}><strong>Grand Total:</strong> ৳{grand.toFixed(2)}</div>
        </div>
      </Card>
      {pos.length>0&&(
        <Card>
          <div style={{fontWeight:'bold',fontSize:13,marginBottom:10}}>Recent Purchase Orders</div>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead><tr style={{background:G.gl}}><th style={{padding:'7px',textAlign:'left'}}>PO#</th><th style={{padding:'7px'}}>Date</th><th style={{padding:'7px'}}>Vendor</th><th style={{padding:'7px',textAlign:'center'}}>Grand Total</th><th style={{padding:'7px',textAlign:'center'}}>Action</th></tr></thead>
            <tbody>{[...pos].sort((a,b)=>b.poNum-a.poNum).map(po=>(
              <tr key={po.id} style={{borderBottom:`1px solid ${G.brd}`,background:curId===po.id?G.gl:'transparent'}}>
                <td style={{padding:'7px',fontWeight:'bold'}}>{po.poNum}</td><td style={{padding:'7px'}}>{po.date}</td><td style={{padding:'7px'}}>{po.vendor||'—'}</td>
                <td style={{padding:'7px',textAlign:'center',fontWeight:'bold'}}>৳{po.grand?.toFixed(2)}</td>
                <td style={{padding:'7px',textAlign:'center'}}><Btn sm onClick={()=>loadPO(po)}>Load</Btn></td>
              </tr>
            ))}</tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function PLTab({pos,setPOs,inv,setInv,catColors}) {
  const [sel,setSel]=useState([]);
  async function moveToInv(){
    const toMv=[];
    pos.forEach(po=>po.items.forEach((it,ii)=>{
      const key=`${po.id}_${ii}`;
      if(sel.includes(key) && !it.moved) toMv.push({...it,_poId:po.id,_idx:ii});
    }));
    if(!toMv.length){setSel([]);return;}
    const draftItems=toMv.map(it=>({date:bjDate(),ts:bjTime(),name:it.name,cat:it.cat||'',qty:+it.qty||0,exp:it.exp||'',sp:+it.sp||0,cp:+it.ppc||0,pw:+it.pw||0,upc:it.upc||''}));
    const { data, error } = await supabase.from('inventory').insert(draftItems.map(d=>toDbInv(d,null))).select();
    if(error){alert('Failed to move to inventory: '+error.message);return;}
    const news=data.map(fromDbInv);
    setInv(p=>[...p,...news]);
    const updatedPOs=pos.map(po=>({...po,items:po.items.map((it,ii)=>sel.includes(`${po.id}_${ii}`)?{...it,moved:true}:it)}));
    const affectedPOs=updatedPOs.filter(po=>po.items.some((it,ii)=>sel.includes(`${po.id}_${ii}`)));
    await Promise.all(affectedPOs.map(po=>supabase.from('purchase_orders').update({items:po.items}).eq('id',po.id)));
    setPOs(updatedPOs);
    alert(`${news.length} items moved to Inventory!`);setSel([]);
  }
  return(
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:8}}>
        <div style={{fontSize:19,fontWeight:'bold',color:G.dk}}>📜 Purchase List</div>
        {sel.length>0&&<Btn onClick={moveToInv}>📦 Move to Inventory ({sel.length})</Btn>}
      </div>
      {pos.length===0?<Card><div style={{textAlign:'center',padding:40,color:G.mut}}>No purchase orders yet. Create one in Purchase Invoice.</div></Card>:
        [...pos].sort((a,b)=>b.poNum-a.poNum).map(po=>{
          const selectableKeys = po.items.map((it,i)=>!it.moved?`${po.id}_${i}`:null).filter(Boolean);
          const allSelHere = selectableKeys.length>0 && selectableKeys.every(k=>sel.includes(k));
          function toggleAllHere(){
            if(allSelHere) setSel(p=>p.filter(x=>!selectableKeys.includes(x)));
            else setSel(p=>[...new Set([...p,...selectableKeys])]);
          }
          return(
          <Card key={po.id} style={{marginBottom:18}}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(135px,1fr))',gap:10,background:G.gl,borderRadius:9,padding:'11px 15px',marginBottom:12}}>
              {[['PO#',po.poNum],['Vendor',po.vendor||'—'],['Grand Total(BDT)',`৳${(po.grand||0).toFixed(2)}`],['Total Cost(BDT)',`৳${(po.totC||0).toFixed(2)}`],['Total Ship(BDT)',`৳${(po.totS||0).toFixed(2)}`],['BD Local Courier(BDT)',`৳${(po.bdLC||0).toFixed(2)}`],['China Local Courier(BDT)',`৳${(po.chnLC||0).toFixed(2)}`],['Costing RMB Rate',po.hdr?.cr||'—'],['Selling RMB Rate',po.hdr?.sr||'—'],['BD Courier(BDT)',po.hdr?.bdc||'—'],['China Courier(RMB)',po.hdr?.cnc||'—']].map(([l,v])=>(
                <div key={l}><div style={{fontSize:10,color:G.mut,fontWeight:'bold'}}>{l}</div><div style={{fontSize:12,fontWeight:'bold',color:G.dk}}>{v}</div></div>
              ))}
            </div>
            <div style={{fontSize:11,color:G.mut,marginBottom:8}}>{po.date} · {po.time}</div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,minWidth:760}}>
                <thead><tr style={{background:G.gd,color:G.w}}>
                  <th style={{padding:'7px 5px',textAlign:'center'}}>{selectableKeys.length>0?<input type="checkbox" checked={allSelHere} onChange={toggleAllHere}/>:'✓'}</th>
                  {['SI.','Product Name','Category','Packed(g)','Qty','Gross(KG)','Unit Ship','Total Ship','Expiry','Per Pkt(RMB)','Set Price','UPC'].map(h=>(
                    <th key={h} style={{padding:'7px 5px',textAlign:'center',whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>{po.items.map((it,i)=>{const key=`${po.id}_${i}`;return(
                  <tr key={key} style={{background:it.moved?'#F1F8F2':i%2===0?G.w:G.bg,borderBottom:`1px solid ${G.brd}`}}>
                    <td style={{padding:'6px',textAlign:'center'}}>{it.moved
                      ?<span title="Already moved to Inventory" style={{color:G.gm,fontSize:15}}>✅</span>
                      :<input type="checkbox" checked={sel.includes(key)} onChange={()=>setSel(p=>p.includes(key)?p.filter(x=>x!==key):[...p,key])}/>
                    }</td>
                    <td style={{padding:'6px',textAlign:'center'}}>{i+1}</td>
                    <td style={{padding:'6px',fontWeight:'bold'}}>{it.name}{it.moved&&<span style={{marginLeft:6,background:G.gl,color:G.gd,borderRadius:4,padding:'1px 6px',fontSize:9,fontWeight:'bold',whiteSpace:'nowrap'}}>✓ IN INVENTORY</span>}</td>
                    <td style={{padding:'6px',textAlign:'center'}}>{it.cat?<CatChip cat={it.cat} catColors={catColors}/>:'—'}</td>
                    <td style={{padding:'6px',textAlign:'center'}}>{it.pw}</td>
                    <td style={{padding:'6px',textAlign:'center'}}>{it.qty}</td>
                    <td style={{padding:'6px',textAlign:'center'}}>{it.gw}</td>
                    <td style={{padding:'6px',textAlign:'center'}}>{it.us}</td>
                    <td style={{padding:'6px',textAlign:'center'}}>{it.ts2}</td>
                    <td style={{padding:'6px',textAlign:'center',...expStyle(it.exp)}}>{it.exp}</td>
                    <td style={{padding:'6px',textAlign:'center',color:G.gd,fontWeight:'bold'}}>{it.ppc?`¥${it.ppc}`:'—'}</td>
                    <td style={{padding:'6px',textAlign:'center'}}>{it.sp?`¥${it.sp}`:'—'}</td>
                    <td style={{padding:'6px',fontSize:10,color:G.mut}}>{it.upc}</td>
                  </tr>
                );})}</tbody>
              </table>
            </div>
          </Card>
          );
        })
      }
    </div>
  );
}

function OOTab({orders,setOrders,sales,setSales,reloadProducts,reloadInventory}) {
  const [conf,setConf]=useState(null);
  const active=orders.filter(o=>o.status!=='completed'&&o.status!=='cancelled');
  const stC={pending:{bg:G.goldl,c:G.yd},processing:{bg:G.bl,c:G.bd},shipped:{bg:G.pl,c:G.pd}};
  function upd(id,f,v){setOrders(p=>p.map(o=>o.id===id?{...o,[f]:v}:o));}
  async function syncOrder(o){
    const { error } = await supabase.from('orders').update({
      customer_name:o.cname, mobile:o.mob, address:o.addr, status:o.status,
      tracking:o.tracking, customer_courier_fee:o.custCourier, discount_total:o.discTotal,
    }).eq('id',o.id);
    if(error) console.error('syncOrder error:', error.message);
  }
  // Cancelling returns the goods to BOTH places: the product's stock counter
  // AND the Inventory tab (a fresh batch is created for each line, since the
  // original batch rows were consumed when the order was placed).
  async function cancelOrder(o){
    const { error: rpcErr } = await supabase.rpc('cancel_order_restore', { p_order_id: o.id });
    if(rpcErr){ alert('Failed to return the stock: '+rpcErr.message); return; }
    const { error } = await supabase.from('orders').update({status:'cancelled'}).eq('id',o.id);
    if(error){ alert('Failed to cancel the order: '+error.message); return; }
    upd(o.id,'status','cancelled');
    if(reloadProducts) await reloadProducts();
    if(reloadInventory) await reloadInventory();   // pull the recreated batches into the table
    setConf(null);
  }
  async function complete(o){
    const sub=o.items.reduce((s,i)=>s+i.up*i.qty,0);
    const tgw=o.items.reduce((s,i)=>s+i.gw*i.qty,0);
    const cour=o.custCourier!=null?o.custCourier:cf(tgw);
    const disc=o.discTotal||sub;const grand=disc+cour;
    const seq=nextSeq(sales);
    const draft={seq,date:bjDate(),type:'online',oid:o.id,cname:o.cname,mob:o.mob,addr:o.addr,sub,disc:sub-disc,discTotal:disc,courier:cour,grand};
    const lineItems=o.items.map(i=>({name:i.name,qty:i.qty,up:i.up,tp:+(i.up*i.qty).toFixed(2)}));
    const { data, error } = await supabase.from('sales').insert(toDbSale(draft)).select().single();
    if(error){alert('Failed to complete order: '+error.message);return;}
    const { error: itErr } = await supabase.from('sale_items').insert(lineItems.map(li=>({sale_id:data.id,name:li.name,qty:li.qty,unit_price:li.up,total_price:li.tp})));
    if(itErr){alert('Failed to save sale items: '+itErr.message);return;}
    const { error: ordErr } = await supabase.from('orders').update({status:'completed'}).eq('id',o.id);
    if(ordErr) console.error('Failed to sync completed status:', ordErr.message);
    const sl={...draft,id:data.id,items:lineItems};
    setSales(p=>[sl,...p]);setOrders(p=>p.map(x=>x.id===o.id?{...x,status:'completed'}:x));setConf(null);
  }
  return(
    <div>
      {conf&&<ConfirmDlg msg={conf.msg} onYes={conf.yes} onNo={()=>setConf(null)}/>}
      <div style={{fontSize:19,fontWeight:'bold',color:G.dk,marginBottom:4}}>🛒 Online Orders</div>
      <div style={{fontSize:12,color:G.mut,marginBottom:16}}>Active: {active.length} · Cancelled: {orders.filter(o=>o.status==='cancelled').length} · Total: {orders.length}</div>
      {active.length===0?<Card><div style={{textAlign:'center',padding:40,color:G.mut}}>No active orders</div></Card>:active.map(o=>{
        const sc=stC[o.status]||stC.pending;
        const sub=o.items.reduce((s,i)=>s+i.up*i.qty,0);
        const tgw=o.items.reduce((s,i)=>s+i.gw*i.qty,0);
        const cour=o.custCourier!=null?o.custCourier:cf(tgw);
        const disc=o.discTotal||sub;const grand=disc+cour;
        return(
          <Card key={o.id} style={{marginBottom:16}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
              <div><div style={{fontWeight:'bold',fontSize:15,color:G.gd}}>{o.id}</div><div style={{fontSize:11,color:G.mut}}>{o.date} {o.time}</div></div>
              <span style={{background:sc.bg,color:sc.c,borderRadius:10,padding:'3px 10px',fontSize:11,fontWeight:'bold'}}>{o.status}</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:10}}>
              <div><div style={{fontSize:10,color:G.mut,marginBottom:3}}>CUSTOMER</div><input value={o.cname} onChange={e=>upd(o.id,'cname',e.target.value)} onBlur={()=>syncOrder(o)} style={{width:'100%',padding:'4px 7px',borderRadius:5,border:`1px solid ${G.brd}`,fontSize:12,boxSizing:'border-box'}}/></div>
              <div><div style={{fontSize:10,color:G.mut,marginBottom:3}}>MOBILE</div><input value={o.mob} onChange={e=>upd(o.id,'mob',e.target.value)} onBlur={()=>syncOrder(o)} style={{width:'100%',padding:'4px 7px',borderRadius:5,border:`1px solid ${G.brd}`,fontSize:12,boxSizing:'border-box'}}/></div>
              <div><div style={{fontSize:10,color:G.mut,marginBottom:3}}>STATUS</div>
                <select value={o.status} onChange={e=>{upd(o.id,'status',e.target.value); syncOrder({...o,status:e.target.value});}} style={{width:'100%',padding:'4px 7px',borderRadius:5,border:`1px solid ${G.brd}`,fontSize:12}}>
                  <option value="pending">Pending</option><option value="processing">Processing</option><option value="shipped">Shipped</option>
                </select>
              </div>
            </div>
            <div style={{marginBottom:10}}><div style={{fontSize:10,color:G.mut,marginBottom:3}}>ADDRESS</div><textarea value={o.addr} onChange={e=>upd(o.id,'addr',e.target.value)} onBlur={()=>syncOrder(o)} style={{width:'100%',padding:'4px 7px',borderRadius:5,border:`1px solid ${G.brd}`,fontSize:11,boxSizing:'border-box',minHeight:44,resize:'vertical'}}/></div>
            {/* Fix 4: the customer's uploaded payment screenshot */}
            <div style={{marginBottom:10,padding:10,borderRadius:8,background:o.proofUrl?G.gl:'#FFEBEE',border:`1px solid ${o.proofUrl?G.g:G.rl}`}}>
              <div style={{fontSize:10,color:G.mut,marginBottom:6,fontWeight:'bold'}}>
                PAYMENT PROOF {o.payMethod&&<span style={{color:G.tx}}>· {o.payMethod==='alipay'?'💙 Alipay':'💚 WeChat Pay'}</span>}
              </div>
              {o.proofUrl
                ? <a href={o.proofUrl} target="_blank" rel="noopener noreferrer" title="Click to open full size">
                    <img src={o.proofUrl} alt={`Payment proof for ${o.id}`} style={{maxWidth:200,maxHeight:200,objectFit:'contain',borderRadius:6,border:`1px solid ${G.brd}`,background:G.w,display:'block',cursor:'zoom-in'}}/>
                  </a>
                : <div style={{fontSize:12,color:G.rd,fontWeight:'bold'}}>⚠️ No payment proof uploaded for this order.</div>
              }
            </div>
            <div style={{background:G.bg,borderRadius:8,padding:10,marginBottom:10}}>
              {o.items.map((it,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:3}}><span>{it.name} ×{it.qty}</span><span>¥{(it.up*it.qty).toFixed(2)}</span></div>)}
              <div style={{borderTop:`1px solid ${G.brd}`,marginTop:7,paddingTop:7}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12}}><span>Subtotal</span><span>¥{sub.toFixed(2)}</span></div>
                {disc!==sub&&<div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:G.gd}}><span>After Discount</span><span>¥{disc.toFixed(2)}</span></div>}
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12,alignItems:'center'}}>
                  <span>Courier</span>
                  <div style={{display:'flex',alignItems:'center',gap:5}}>
                    <input type="number" value={o.custCourier??''} onChange={e=>upd(o.id,'custCourier',e.target.value===''?null:+e.target.value)} onBlur={()=>syncOrder(o)} placeholder={String(cf(tgw))} style={{width:58,padding:'2px 5px',borderRadius:4,border:`1px solid ${G.brd}`,fontSize:11}}/>
                    <span>¥{cour.toFixed(2)}</span>
                  </div>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',fontWeight:'bold',fontSize:14,marginTop:5,color:G.gd}}><span>Grand Total</span><span>¥{grand.toFixed(2)}</span></div>
              </div>
            </div>
            <div style={{marginBottom:10,display:'flex',alignItems:'center',gap:8,fontSize:12}}>
              <span style={{color:G.tx,whiteSpace:'nowrap'}}>Custom discount price (¥):</span>
              <input type="number" value={o.discTotal??''} onChange={e=>upd(o.id,'discTotal',e.target.value?+e.target.value:null)} onBlur={()=>syncOrder(o)} placeholder="Optional" style={{width:90,padding:'4px 7px',borderRadius:5,border:`1px solid ${G.brd}`,fontSize:12}}/>
            </div>
            <div style={{marginBottom:12}}>
              <div style={{fontWeight:'bold',fontSize:12,marginBottom:6}}>📦 Tracking Numbers</div>
              {o.tracking.map((tk,i)=>(
                <div key={i} style={{display:'flex',gap:6,marginBottom:5}}>
                  <input value={tk} onChange={e=>{const tr=[...o.tracking];tr[i]=e.target.value;upd(o.id,'tracking',tr);}} onBlur={()=>syncOrder(o)} style={{flex:1,padding:'5px 9px',borderRadius:5,border:`1px solid ${G.brd}`,fontSize:12}}/>
                  <button onClick={()=>{const nt=o.tracking.filter((_,j)=>j!==i);upd(o.id,'tracking',nt);syncOrder({...o,tracking:nt});}} style={{background:'none',border:`1px solid ${G.rd}`,color:G.rd,borderRadius:5,padding:'3px 9px',cursor:'pointer',fontSize:11}}>✕</button>
                </div>
              ))}
              <Btn sm v='info' onClick={()=>{const nt=[...o.tracking,''];upd(o.id,'tracking',nt);syncOrder({...o,tracking:nt});}}>+ Add Tracking #</Btn>
            </div>
            <div style={{display:'flex',gap:8}}>
              <Btn onClick={()=>setConf({msg:`Complete order ${o.id} and move to Sales List?`,yes:()=>complete(o)})}>✅ Complete Order</Btn>
              <Btn v='danger' sm onClick={()=>setConf({msg:`Cancel order ${o.id}? The items will be returned to stock.`,yes:()=>cancelOrder(o)})}>Cancel</Btn>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function SITab({prods,inv,sales,setSales,catColors,reloadProducts}) {
  function blankSIItem(){return {pid:null,name:'',pw:'',qty:'',unit:'PCS',up:'',tp:'',gw:'',exps:[],exp:''};}
  const [cust,setCust]=useState({name:'',addr:'',mob:''});
  const [items,setItems]=useState([blankSIItem()]);
  const [ctype,setCtype]=useState('Not Free');
  const [ccour,setCcour]=useState('');
  const [dtype,setDtype]=useState('No');
  const [dpct,setDpct]=useState(0);
  const [cdsc,setCdsc]=useState('');
  const [selIt,setSelIt]=useState([]);
  const [sdpct,setSdpct]=useState(10);
  const [curId,setCurId]=useState(null);
  const [onum,setOnum]=useState(()=>nextSeq(sales));
  const [rq,setRq]=useState('');
  const [rsel,setRsel]=useState([]);
  const [saving,setSaving]=useState(false);

  // ---- Walk-in sales now move real stock. ----
  // When EDITING an invoice that already took its stock, the units it reserved are
  // still "available" to that same invoice — otherwise re-saving an unchanged invoice
  // would look like it needed twice the stock.
  const savedQty = useMemo(()=>{
    const m={};
    const ex = curId ? sales.find(x=>x.id===curId) : null;
    if(ex && ex.type==='invoice') (ex.items||[]).forEach(i=>{ if(i.pid) m[i.pid]=(m[i.pid]||0)+(+i.qty||0); });
    return m;
  },[curId,sales]);
  function availFor(pid){
    const pr=prods.find(x=>x.id===pid);
    if(!pr) return 0;
    return (pr.stock||0) + (savedQty[pid]||0);
  }
  function prodFor(it){ return prods.find(x=>x.id===it.pid) || prods.find(x=>x.name===it.name) || null; }
  const overLines = items.filter(i=>{
    if(!i.name || !i.qty) return false;
    const pr = prodFor(i);
    return pr ? (+i.qty||0) > availFor(pr.id) : false;
  });

  const sub=items.reduce((s,i)=>s+(+i.tp||0),0);
  const tgw=items.reduce((s,i)=>s+(+i.gw||0)*(+i.qty||0),0);
  const cour=ctype==='Free'?0:ctype==='Not Free'?cf(tgw):(+ccour||0);
  const damt=dtype==='Yes'?sub*(+dpct/100):dtype==='Customized Discount'?(+cdsc||0):0;
  const pad=sub-damt; const grand=pad+cour;
  const hasDsc = dtype!=='No';

  function recalcRow(u){ u.tp=(+(u.qty||0)*(+(u.up||0))).toFixed(2); return u; }
  function updIt(idx,f,v){
    setItems(prev=>prev.map((it,i)=>{
      if(i!==idx) return it;
      let u={...it,[f]:v};
      if(f==='name'){
        u.pid=null;   // re-linked below when picked from the list, or matched by name on save
        if(v===''){u.pw='';u.up='';u.gw='';u.exps=[];u.exp='';}
      }
      return recalcRow(u);
    }));
  }
  function selectProduct(idx,p){
    setItems(prev=>{
      const exps = inv.filter(x=>x.name===p.name && x.qty>0).map(x=>({exp:x.exp,qty:x.qty}));
      const next = prev.map((it,i)=> i!==idx ? it : recalcRow({...it,pid:p.id,name:p.name,pw:p.pw,up:ep(p),unit:p.unit,gw:p.gw,exps,exp:''}));
      return idx===prev.length-1 ? [...next, blankSIItem()] : next;
    });
  }
  function applySD(){
    setItems(prev=>prev.map((it,i)=>{
      if(!selIt.includes(i)) return it;
      const p=prods.find(x=>x.name===it.name); const bp=p?p.sp:+it.up;
      const np=+(bp*(1-sdpct/100)).toFixed(2);
      return recalcRow({...it,up:np});
    }));
    setSelIt([]);
  }
  function resetForm(){
    setCust({name:'',addr:'',mob:''});setItems([blankSIItem()]);setCtype('Not Free');setCcour('');setDtype('No');setDpct(0);setCdsc('');setCurId(null);setOnum(nextSeq(sales));
  }
  async function save(){
    if(saving) return;
    const fi=items.filter(i=>i.name&&i.qty);
    if(!fi.length){alert('Add at least one item');return;}

    // Link each line back to a real product so stock can be tracked. A line typed
    // by hand that matches nothing is still allowed — it just doesn't move stock.
    const lines = fi.map(i=>{
      const pr = prodFor(i);
      return { product_id: pr?pr.id:null, name:i.name, qty:+i.qty, unit_price:+i.up||0, total_price:+i.tp||0 };
    });

    // Friendly pre-check. The database checks again, atomically — this is only
    // here so you get a clear message instead of a raw Postgres error.
    const need={};
    lines.forEach(l=>{ if(l.product_id) need[l.product_id]=(need[l.product_id]||0)+l.qty; });
    for(const pid of Object.keys(need)){
      const avail = availFor(+pid);
      if(need[pid] > avail){
        const pr = prods.find(x=>String(x.id)===String(pid));
        alert(`Not enough stock for "${pr?pr.name:pid}" — ${avail} available, this invoice needs ${need[pid]}.`);
        return;
      }
    }

    const existing = curId ? sales.find(x=>x.id===curId) : null;
    const seq  = existing ? existing.seq  : onum;
    const dt   = existing ? existing.date : bjDate();
    setSaving(true);
    try{
      // One call: writes the invoice, its line items, and takes the stock off the
      // shelf — in a single transaction. Editing an invoice returns its old stock
      // first, so the new quantities are measured against the true total.
      const { data: savedId, error } = await supabase.rpc('save_invoice', {
        p_sale_id:    curId,
        p_seq:        seq,
        p_date:       dt,
        p_oid:        `INV${seq}`,
        p_cname:      cust.name,
        p_mob:        cust.mob,
        p_addr:       cust.addr,
        p_items:      lines,
        p_sub:        sub,
        p_disc:       damt,
        p_disc_total: pad,
        p_courier:    cour,
        p_grand:      grand,
      });
      if(error) throw new Error(error.message);

      const saved={
        id:savedId, seq, date:dt, type:'invoice', oid:`INV${seq}`,
        cname:cust.name, mob:cust.mob, addr:cust.addr,
        sub, disc:damt, discTotal:pad, courier:cour, grand,
        items: lines.map(l=>({pid:l.product_id,name:l.name,qty:l.qty,up:l.unit_price,tp:l.total_price})),
      };
      setSales(p=> curId ? p.map(x=>x.id===curId?saved:x) : [saved,...p]);
      setCurId(savedId);
      if(reloadProducts) await reloadProducts();
      alert('Sales invoice saved — stock updated.');
    }catch(err){
      alert(err.message || 'Failed to save the invoice.');
    }finally{ setSaving(false); }
  }
  async function deleteCurrent(){
    if(!curId){alert('Load or save an invoice first, or select one below to delete.');return;}
    if(!window.confirm('Delete this invoice? Its items will be returned to stock.')) return;
    const { error } = await supabase.rpc('delete_sales', { p_ids: [curId] });
    if(error){alert('Failed to delete: '+error.message);return;}
    setSales(p=>p.filter(x=>x.id!==curId));
    if(reloadProducts) await reloadProducts();
    resetForm();
  }
  function printCurrent(){
    const existing = curId ? sales.find(s=>s.id===curId) : null;
    const html=buildSalesReceiptHTML({orderNo:existing?existing.seq:onum,cname:cust.name,mob:cust.mob,addr:cust.addr,items:items.filter(i=>i.name&&i.qty),sub,pad,cour,grand,hasDsc});
    openPrintWindow(html);
  }
  function loadOrder(s){
    // An online sale's stock came off the shelf when the customer checked out.
    // Editing it here would take it a second time, so don't allow it.
    if(s.type==='online'){
      alert('That is a completed online order, not a walk-in invoice.\n\nIts stock was already deducted when the customer checked out, so editing it here would double-count. Manage it from the Online Orders tab instead.');
      return;
    }
    setCurId(s.id); setOnum(s.seq);
    setCust({name:s.cname||'',mob:s.mob||'',addr:s.addr||''});
    setItems([...s.items.map(i=>{
      const p=prods.find(x=>x.id===i.pid) || prods.find(x=>x.name===i.name);
      const exps = p ? inv.filter(x=>x.name===p.name&&x.qty>0).map(x=>({exp:x.exp,qty:x.qty})) : [];
      return {pid:i.pid||(p?p.id:null),name:i.name,pw:p?p.pw:'',qty:String(i.qty),unit:p?p.unit:'PCS',up:String(i.up),tp:String(i.tp),gw:p?p.gw:'',exps,exp:''};
    }), blankSIItem()]);
    setCtype('Customized Courier'); setCcour(String(s.courier||0));
    setDtype(s.disc>0?'Customized Discount':'No'); setCdsc(String(s.disc||0));
  }
  async function deleteSelectedInvoices(){
    if(!rsel.length) return;
    if(!window.confirm(`Delete ${rsel.length} sale(s)? Items from walk-in invoices will be returned to stock.`)) return;
    const { error } = await supabase.rpc('delete_sales', { p_ids: rsel });
    if(error){alert('Failed to delete: '+error.message);return;}
    setSales(p=>p.filter(x=>!rsel.includes(x.id)));
    if(curId && rsel.includes(curId)) resetForm();
    setRsel([]);
    if(reloadProducts) await reloadProducts();
  }
  function printSale(s){
    openPrintWindow(buildSalesReceiptHTML({orderNo:s.seq,cname:s.cname,mob:s.mob,addr:s.addr,items:s.items,sub:s.sub,pad:s.discTotal,cour:s.courier,grand:s.grand,hasDsc:s.disc>0}));
  }

  const recent = useMemo(()=>{
    if(!rq) return sales;
    const lq=rq.toLowerCase();
    return sales.filter(s=>String(s.seq).includes(rq)||((s.oid||'').toLowerCase().includes(lq))||((s.cname||'').toLowerCase().includes(lq)));
  },[sales,rq]);

  return(
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:8}}>
        <div style={{fontSize:19,fontWeight:'bold',color:G.dk}}>💰 Sales Invoice</div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          <Btn onClick={resetForm}>+ New</Btn>
          <Btn v='info' onClick={save} disabled={saving||overLines.length>0}>{saving?'Saving…':'💾 Save'}</Btn>
          <Btn v='outline' onClick={printCurrent}>🖨️ Print PDF</Btn>
          <Btn v='danger' onClick={deleteCurrent}>🗑️ Delete</Btn>
          {selIt.length>0&&<><input type="number" value={sdpct} onChange={e=>setSdpct(+e.target.value)} style={{width:52,padding:'4px 7px',borderRadius:5,border:`1px solid ${G.brd}`,fontSize:12}}/><Btn v='warn' sm onClick={applySD}>% Apply to Selected</Btn></>}
        </div>
      </div>
      <Card style={{marginBottom:14}}>
        <div style={{textAlign:'center',fontSize:11,fontWeight:'bold',color:G.gd,marginBottom:10,lineHeight:1.5}}>SALES RECEIPT · Taste Of Desh · Raa Trade International · Beijing, China · WeChat: RaaTrade · Order #{curId?(sales.find(s=>s.id===curId)?.seq||onum):onum}</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(175px,1fr))',gap:10}}>
          <FInput label="Customer Name" value={cust.name} onChange={v=>setCust(p=>({...p,name:v}))}/>
          <FInput label="Mobile" value={cust.mob} onChange={v=>setCust(p=>({...p,mob:v}))}/>
          <FInput label="Address" value={cust.addr} onChange={v=>setCust(p=>({...p,addr:v}))}/>
          <div style={{fontSize:12,color:G.tx,display:'flex',alignItems:'center',paddingTop:18}}>📅 {bjDate()} · ⏰ {bjTime()}</div>
        </div>
      </Card>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
        <Card><div style={{fontWeight:'bold',fontSize:13,marginBottom:10,color:G.gd}}>Courier</div><FSel value={ctype} onChange={setCtype} options={['Free','Not Free','Customized Courier']}/>{ctype==='Customized Courier'&&<FInput label="Custom (RMB)" value={ccour} onChange={setCcour} type="number"/>}</Card>
        <Card><div style={{fontWeight:'bold',fontSize:13,marginBottom:10,color:G.gd}}>Discount</div><FSel value={dtype} onChange={setDtype} options={['No','Yes','Customized Discount']}/>{dtype==='Yes'&&<FInput label="Discount %" value={dpct} onChange={setDpct} type="number"/>}{dtype==='Customized Discount'&&<FInput label="Amount (RMB)" value={cdsc} onChange={setCdsc} type="number"/>}</Card>
      </div>
      {overLines.length>0&&(
        <div style={{background:'#FFEBEE',border:`1px solid ${G.rd}`,borderRadius:10,padding:12,marginBottom:14}}>
          <div style={{fontWeight:'bold',color:G.rd,fontSize:13,marginBottom:4}}>⚠️ Not enough stock</div>
          {overLines.map((i,k)=>{
            const pr=prodFor(i);
            return <div key={k} style={{fontSize:12,color:G.rd}}>“{i.name}” — {availFor(pr.id)} available, this invoice needs {i.qty}.</div>;
          })}
          <div style={{fontSize:11,color:G.tx,marginTop:5}}>Reduce the quantity, or add stock in the Inventory tab.</div>
        </div>
      )}
      <Card style={{marginBottom:14,overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,minWidth:800}}>
          <thead><tr style={{background:G.gd,color:G.w}}>
            {['','Exp Date','Stock','Gross(KG)','Total Gross','Product Name','Packed(g)','Qty','Unit','Unit Price','Total','✕'].map(h=>(
              <th key={h} style={{padding:'7px 5px',textAlign:'center',whiteSpace:'nowrap'}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{items.map((it,idx)=>{
            const p=prodFor(it);const tgwR=(+it.gw||0)*(+it.qty||0);
            // What this invoice can actually take: current stock, plus anything this
            // same invoice already has reserved (only relevant when editing).
            const avail = p ? availFor(p.id) : null;
            const over  = avail!=null && (+it.qty||0) > avail;
            return(
              <tr key={idx} style={{background:idx%2===0?G.w:G.bg,borderBottom:`1px solid ${G.brd}`}}>
                <td style={{padding:'5px',textAlign:'center'}}><input type="checkbox" checked={selIt.includes(idx)} onChange={()=>setSelIt(p2=>p2.includes(idx)?p2.filter(x=>x!==idx):[...p2,idx])}/></td>
                <td style={{padding:'5px'}}>{it.exps.length>0?<select value={it.exp} onChange={e=>updIt(idx,'exp',e.target.value)} style={{padding:'3px',borderRadius:4,border:`1px solid ${G.brd}`,fontSize:10}}><option value="">Any</option>{it.exps.map(x=><option key={x.exp} value={x.exp}>{x.exp} ({x.qty})</option>)}</select>:<span style={{color:G.mut,fontSize:10}}>—</span>}</td>
                <td style={{padding:'5px',textAlign:'center'}}>{avail!=null?<span style={{...stStyle(avail),padding:'2px 6px',borderRadius:4,fontSize:10,display:'inline-block',outline:over?`2px solid ${G.rd}`:'none'}}>{avail}</span>:'—'}</td>
                <td style={{padding:'5px',textAlign:'center'}}>{it.gw||'—'}</td>
                <td style={{padding:'5px',textAlign:'center',fontWeight:'bold'}}>{tgwR.toFixed(3)}</td>
                <td style={{padding:'5px',minWidth:150}}><ComboInput value={it.name} onChange={v=>updIt(idx,'name',v)} onPick={p2=>selectProduct(idx,p2)} options={prods} placeholder="Type to search product..."/></td>
                <td style={{padding:'5px',textAlign:'center'}}>{it.pw||'—'}</td>
                <td style={{padding:'5px'}}><input type="number" value={it.qty} onChange={e=>updIt(idx,'qty',e.target.value)} style={{width:48,padding:'4px',borderRadius:4,border:`1px solid ${over?G.rd:G.brd}`,fontSize:11,textAlign:'center',color:over?G.rd:G.dk,fontWeight:over?'bold':'normal'}}/></td>
                <td style={{padding:'5px',textAlign:'center',fontSize:10}}>{it.unit}</td>
                <td style={{padding:'5px'}}><input type="number" value={it.up} onChange={e=>updIt(idx,'up',e.target.value)} style={{width:58,padding:'4px',borderRadius:4,border:`1px solid ${G.brd}`,fontSize:11}}/></td>
                <td style={{padding:'5px',textAlign:'center',fontWeight:'bold',color:G.gd}}>¥{(+it.tp||0).toFixed(2)}</td>
                <td style={{padding:'5px',textAlign:'center'}}>{items.length>1&&<button onClick={()=>setItems(p2=>p2.filter((_,j)=>j!==idx))} style={{background:'none',border:'none',cursor:'pointer',color:'#B71C1C',fontSize:14}}>✕</button>}</td>
              </tr>
            );
          })}</tbody>
        </table>
        <div style={{marginTop:10}}><Btn sm onClick={()=>setItems(p=>[...p,blankSIItem()])}>+ Add Row</Btn></div>
        <div style={{maxWidth:280,marginLeft:'auto',marginTop:14,fontSize:13}}>
          <div style={{display:'flex',justifyContent:'space-between',padding:'5px 0'}}><span>Sub-total</span><span>¥{sub.toFixed(2)}</span></div>
          {hasDsc&&<div style={{display:'flex',justifyContent:'space-between',padding:'5px 0',color:G.gd,fontWeight:'bold'}}><span>Price After Discount</span><span>¥{pad.toFixed(2)}</span></div>}
          <div style={{display:'flex',justifyContent:'space-between',padding:'5px 0'}}><span>Courier</span><span>¥{cour.toFixed(2)}</span></div>
          <div style={{display:'flex',justifyContent:'space-between',padding:'7px 0',fontWeight:'bold',fontSize:16,borderTop:`2px solid ${G.brd}`,color:G.gd}}><span>Grand Total</span><span>¥{grand.toFixed(2)}</span></div>
        </div>
        <div style={{textAlign:'center',fontStyle:'italic',color:G.tx,fontSize:13,marginTop:10}}>Thank you for your business</div>
      </Card>
      <Card>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10,flexWrap:'wrap',gap:8}}>
          <div style={{fontWeight:'bold',fontSize:13}}>Recent Invoice Orders</div>
          <input value={rq} onChange={e=>setRq(e.target.value)} placeholder="Search order # or customer..." style={{padding:'6px 10px',borderRadius:6,border:`1px solid ${G.brd}`,fontSize:12}}/>
        </div>
        {rsel.length>0&&(
          <div style={{display:'flex',gap:6,marginBottom:10,flexWrap:'wrap'}}>
            <Btn sm onClick={()=>{const s=sales.find(x=>x.id===rsel[0]); if(s)loadOrder(s); setRsel([]);}}>📂 Load to Edit</Btn>
            <Btn sm v='outline' onClick={()=>{const s=sales.find(x=>x.id===rsel[0]); if(s)printSale(s);}}>🖨️ Print</Btn>
            <Btn sm v='danger' onClick={deleteSelectedInvoices}>🗑️ Delete Selected ({rsel.length})</Btn>
          </div>
        )}
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead><tr style={{background:G.gl}}><th style={{padding:'7px'}}></th><th style={{padding:'7px',textAlign:'left'}}>Order #</th><th style={{padding:'7px'}}>Date</th><th style={{padding:'7px'}}>Type</th><th style={{padding:'7px'}}>Customer</th><th style={{padding:'7px',textAlign:'center'}}>Total</th></tr></thead>
            <tbody>{recent.map(s=>(
              <tr key={s.id} style={{borderBottom:`1px solid ${G.brd}`,background:rsel.includes(s.id)?G.gl:(curId===s.id?'#F1F8F2':'transparent')}}>
                <td style={{padding:'7px',textAlign:'center'}}><input type="checkbox" checked={rsel.includes(s.id)} onChange={()=>setRsel(p=>p.includes(s.id)?p.filter(x=>x!==s.id):[...p,s.id])}/></td>
                <td style={{padding:'7px',fontWeight:'bold',color:G.gd}}>#{s.seq}</td><td style={{padding:'7px'}}>{s.date}</td>
                <td style={{padding:'7px'}}><span style={{background:s.type==='online'?G.bl:G.goldl,color:s.type==='online'?G.bd:G.yd,borderRadius:8,padding:'2px 8px',fontSize:11,fontWeight:'bold'}}>{s.type==='online'?'Online':'Invoice'}</span></td>
                <td style={{padding:'7px'}}>{s.cname||'—'}</td><td style={{padding:'7px',textAlign:'center',fontWeight:'bold'}}>¥{s.grand?.toFixed(2)}</td>
              </tr>
            ))}</tbody>
          </table>
          {recent.length===0&&<div style={{textAlign:'center',padding:24,color:G.mut}}>No matching orders</div>}
        </div>
      </Card>
    </div>
  );
}

function SLTab({sales,setSales,reloadProducts}) {
  const [q,setQ]=useState('');
  const [exp,setExp]=useState(new Set());
  const [sel,setSel]=useState([]);
  const list=useMemo(()=>!q?sales:sales.filter(s=>(s.oid||'').toLowerCase().includes(q.toLowerCase())||(s.cname||'').toLowerCase().includes(q.toLowerCase())||String(s.seq).includes(q)),[sales,q]);
  const rev=sales.reduce((s,o)=>s+o.grand,0);
  const cour=sales.reduce((s,o)=>s+(o.courier||0),0);
  function toggle(id){setExp(p=>{const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n;});}
  const allSel = list.length>0 && list.every(s=>sel.includes(s.id));
  function toggleAll(){ setSel(allSel ? [] : list.map(s=>s.id)); }
  async function deleteSelected(){
    if(!sel.length) return;
    if(!window.confirm(`Delete ${sel.length} sales record(s)? Items from walk-in invoices will be returned to stock. This cannot be undone.`)) return;
    // Goes through the database function so that walk-in invoices hand their
    // stock back. Online sales don't — their stock was taken by the order itself.
    const { error } = await supabase.rpc('delete_sales', { p_ids: sel });
    if(error){alert('Failed to delete: '+error.message);return;}
    setSales(p=>p.filter(s=>!sel.includes(s.id)));
    setSel([]);
    if(reloadProducts) await reloadProducts();
  }
  return(
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:8}}>
        <div style={{fontSize:19,fontWeight:'bold',color:G.dk}}>📈 Sales List</div>
        {sel.length>0&&<Btn v='danger' sm onClick={deleteSelected}>🗑️ Delete Selected ({sel.length})</Btn>}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:12,marginBottom:18}}>
        <Stat icon="💰" label="Total Revenue (¥)" value={`¥${Math.round(rev)}`} color={G.gd}/>
        <Stat icon="🚚" label="Total Courier (¥)" value={`¥${Math.round(cour)}`} color={G.bd}/>
        <Stat icon="📦" label="Total Orders" value={sales.length} color={G.pd}/>
      </div>
      <div style={{marginBottom:14}}><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by order #, ID or customer..." style={{width:'100%',padding:'9px 12px',borderRadius:8,border:`1px solid ${G.brd}`,fontSize:13,boxSizing:'border-box'}}/></div>
      {list.length===0?<Card><div style={{textAlign:'center',padding:40,color:G.mut}}>No sales records yet</div></Card>:(
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth:820}}>
            <thead><tr style={{background:G.gd,color:G.w}}>
              <th style={{padding:'9px 7px',textAlign:'center'}}><input type="checkbox" checked={allSel} onChange={toggleAll}/></th>
              <th style={{padding:'9px 7px'}}></th>
              {['Order #','Date','Type','Customer','Mobile','Subtotal','Discount','Courier','Grand Total'].map(h=>(
                <th key={h} style={{padding:'9px 7px',textAlign:'center',whiteSpace:'nowrap'}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{list.map((s,i)=>(
              <React.Fragment key={s.id}>
                <tr style={{background:i%2===0?G.w:G.bg,borderBottom:`1px solid ${G.brd}`}}>
                  <td style={{padding:'7px',textAlign:'center'}}><input type="checkbox" checked={sel.includes(s.id)} onChange={()=>setSel(p=>p.includes(s.id)?p.filter(x=>x!==s.id):[...p,s.id])}/></td>
                  <td onClick={()=>toggle(s.id)} style={{padding:'7px',textAlign:'center',cursor:'pointer'}}>{exp.has(s.id)?'▼':'▶'}</td>
                  <td style={{padding:'7px',textAlign:'center',fontWeight:'bold',color:G.gd}}>#{s.seq}</td><td style={{padding:'7px',textAlign:'center'}}>{s.date}</td>
                  <td style={{padding:'7px',textAlign:'center'}}><span style={{background:s.type==='online'?G.bl:G.goldl,color:s.type==='online'?G.bd:G.yd,borderRadius:8,padding:'2px 8px',fontSize:11,fontWeight:'bold'}}>{s.type==='online'?'🛒 Online':'💰 Invoice'}</span></td>
                  <td style={{padding:'7px'}}>{s.cname||'—'}</td><td style={{padding:'7px'}}>{s.mob||'—'}</td>
                  <td style={{padding:'7px',textAlign:'center'}}>¥{s.sub?.toFixed(2)}</td>
                  <td style={{padding:'7px',textAlign:'center',color:s.disc>0?'#B71C1C':G.mut}}>{s.disc>0?`-¥${s.disc.toFixed(2)}`:'—'}</td>
                  <td style={{padding:'7px',textAlign:'center'}}>¥{s.courier?.toFixed(2)}</td>
                  <td style={{padding:'7px',textAlign:'center',fontWeight:'bold',fontSize:14,color:G.gd}}>¥{s.grand?.toFixed(2)}</td>
                </tr>
                {exp.has(s.id)&&(
                  <tr><td colSpan={11} style={{background:G.gl,padding:'10px 18px'}}>
                    <div style={{fontWeight:'bold',fontSize:11,color:G.gd,marginBottom:6}}>Items Ordered:</div>
                    {s.items.map((it,k)=>(
                      <div key={k} style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'3px 0',borderBottom:k<s.items.length-1?`1px dashed ${G.brd}`:'none'}}>
                        <span>{it.name} × {it.qty}</span><span>¥{(it.tp!=null?it.tp:it.up*it.qty).toFixed(2)}</span>
                      </div>
                    ))}
                  </td></tr>
                )}
              </React.Fragment>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AdminApp({prods,setProds,cats,setCats,catColors,setCatColors,inv,setInv,delInv,setDelInv,orders,setOrders,sales,setSales,pos,setPOs,customSlides,setCustomSlides,goCustomer,qrCodes,setQrCodes,onLogout,reloadProducts,reloadInventory}) {
  const [tab,setTab]=useState('dash');
  const [open,setOpen]=useState(true);
  const tabs=[
    {id:'dash',icon:'📊',l:'Dashboard'},{id:'prods',icon:'📋',l:'Product List'},{id:'inv',icon:'🏭',l:'Inventory'},
    {id:'pi',icon:'🧾',l:'Purchase Invoice'},{id:'pl',icon:'📜',l:'Purchase List'},{id:'oo',icon:'🛒',l:'Online Orders'},
    {id:'si',icon:'💰',l:'Sales Invoice'},{id:'sl',icon:'📈',l:'Sales List'},
  ];
  return(
    <div>
      <div style={{background:G.grad,padding:'10px 18px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:15}}>⚙️</span><div style={{color:G.gold,fontWeight:'bold',fontSize:14}}>Admin Panel — Taste of Desh</div>
        </div>
        <button onClick={goCustomer} style={{padding:'5px 13px',borderRadius:16,border:'none',cursor:'pointer',background:'rgba(255,255,255,0.15)',color:G.w,fontWeight:'bold',fontSize:11}}>🏠 View Storefront</button>
        <button onClick={onLogout} style={{padding:'5px 13px',borderRadius:16,border:'none',cursor:'pointer',background:'rgba(255,255,255,0.15)',color:G.w,fontWeight:'bold',fontSize:11}}>🚪 Logout</button>
      </div>
      <div style={{display:'flex',minHeight:'calc(100vh - 86px)',background:G.bg}}>
        <div style={{width:open?206:58,flexShrink:0,background:G.gd,transition:'width 0.2s ease',display:'flex',flexDirection:'column',position:'sticky',top:0,alignSelf:'flex-start',height:'calc(100vh - 86px)',overflowY:'auto'}}>
          <button onClick={()=>setOpen(o=>!o)} style={{background:'rgba(255,255,255,0.08)',border:'none',color:G.gold,padding:'13px 0',cursor:'pointer',fontSize:17,width:'100%',textAlign:'center'}}>{open?'◀ ☰':'☰'}</button>
          {tabs.map(tb=>(
            <button key={tb.id} onClick={()=>setTab(tb.id)} title={tb.l} style={{display:'flex',alignItems:'center',gap:11,padding:open?'12px 16px':'12px 0',justifyContent:open?'flex-start':'center',border:'none',background:tab===tb.id?'rgba(255,255,255,0.14)':'transparent',borderLeft:tab===tb.id?`4px solid ${G.gold}`:'4px solid transparent',color:G.w,cursor:'pointer',fontSize:13,fontWeight:tab===tb.id?'bold':'normal',width:'100%',boxSizing:'border-box'}}>
              <span style={{fontSize:17,flexShrink:0}}>{tb.icon}</span>{open&&<span style={{whiteSpace:'nowrap'}}>{tb.l}</span>}
            </button>
          ))}
        </div>
        <div style={{flex:1,padding:20,minWidth:0,overflowX:'auto'}}>
         <TabErrorBoundary key={tab}>
          {tab==='dash'&&<DashTab prods={prods} inv={inv} orders={orders} sales={sales} catColors={catColors} customSlides={customSlides} setCustomSlides={setCustomSlides} qrCodes={qrCodes} setQrCodes={setQrCodes}/>}
          {tab==='prods'&&<ProdTab prods={prods} setProds={setProds} cats={cats} setCats={setCats} catColors={catColors} setCatColors={setCatColors} inv={inv} setInv={setInv} orders={orders} sales={sales}/>}
          {tab==='inv'&&<InvTab inv={inv} setInv={setInv} prods={prods} setProds={setProds} cats={cats} catColors={catColors} delInv={delInv} setDelInv={setDelInv} reloadProducts={reloadProducts}/>}
          {tab==='pi'&&<PITab prods={prods} pos={pos} setPOs={setPOs} catColors={catColors}/>}
          {tab==='pl'&&<PLTab pos={pos} setPOs={setPOs} inv={inv} setInv={setInv} catColors={catColors}/>}
          {tab==='oo'&&<OOTab orders={orders} setOrders={setOrders} sales={sales} setSales={setSales} reloadProducts={reloadProducts} reloadInventory={reloadInventory}/>}
          {tab==='si'&&<SITab prods={prods} inv={inv} sales={sales} setSales={setSales} catColors={catColors} reloadProducts={reloadProducts}/>}
          {tab==='sl'&&<SLTab sales={sales} setSales={setSales} reloadProducts={reloadProducts}/>}
         </TabErrorBoundary>
        </div>
      </div>
    </div>
  );
}

function AdminLogin({onLogin}){
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);

  async function doLogin(){
    if(!email||!password){setError('Enter email and password');return;}
    setBusy(true);setError('');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if(error){setBusy(false);setError(error.message);return;}
    const profile = await fetchProfile(data.user.id);
    if(profile?.role!=='admin'){
      await supabase.auth.signOut();
      setBusy(false);
      setError('This account does not have admin access.');
      return;
    }
    setBusy(false);
    onLogin({
      id:data.user.id,
      name:profile?.full_name||data.user.email?.split('@')[0]||'Admin',
      mobile:profile?.mobile||'',
      email:profile?.email||data.user.email||'',
      role:'admin',
    });
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#0d522c'}}>
      <div style={{background:'#fff',borderRadius:16,padding:32,width:320,maxWidth:'90%',boxSizing:'border-box'}}>
        <div style={{fontWeight:900,fontSize:22,color:'#0d522c',marginBottom:4,textAlign:'center'}}>Admin Login</div>
        <div style={{fontSize:12,color:'#77bba2',textAlign:'center',marginBottom:20}}>Taste of Desh</div>
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" style={{width:'100%',padding:'12px 16px',borderRadius:30,border:'1px solid #ddd',marginBottom:10,boxSizing:'border-box'}}/>
        <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" type="password" onKeyDown={e=>e.key==='Enter'&&doLogin()} style={{width:'100%',padding:'12px 16px',borderRadius:30,border:'1px solid #ddd',marginBottom:10,boxSizing:'border-box'}}/>
        {error && <div style={{color:'#c0392b',fontSize:12,marginBottom:10,textAlign:'center'}}>{error}</div>}
        <button onClick={doLogin} disabled={busy} style={{width:'100%',padding:'13px',borderRadius:30,border:'none',background:'#3c7962',color:'#fff',fontWeight:'bold',cursor:busy?'default':'pointer'}}>{busy?'...':'Login'}</button>
      </div>
    </div>
  );
}

function pathIsAdmin(){
  return typeof window !== 'undefined' && window.location.pathname.replace(/\/+$/,'') === '/admin';
}

export default function App() {
  useGlobalCss();
  const [view,setView]=useState(()=>pathIsAdmin()?'admin':'customer');
  const [lang,setLang]=useState('en');
  const [auth,setAuth]=useState({loggedIn:false,user:null});
  const [prods,setProds]=useState([]);
  const [cats,setCats]=useState([]);   // loaded from the `categories` table below
  const [catColors,setCatColors]=useState(DEFAULT_CAT_COLORS);
  const [inv,setInv]=useState([]);
  const [delInv,setDelInv]=useState([]);
  const [orders,setOrders]=useState([]);
  const [sales,setSales]=useState([]);
  const [pos,setPOs]=useState([]);
  const [cart,setCart]=useState([]);
  const [customSlides,setCustomSlides]=useState([]);
  const [qrCodes,setQrCodes]=useState({alipay:'',wechat:''});
  // Stock guard: a customer can never put more of a product in the cart than
  // the inventory actually holds. (The database re-checks this at checkout too —
  // client-side limits alone can be bypassed from the browser console.)
  function addToCart(p){
    const max = p.stock || 0;
    if(max <= 0){ alert(`"${p.name}" is out of stock.`); return; }
    const ex = cart.find(i=>i.id===p.id);
    if(ex && ex.qty >= max){ alert(`Only ${max} of "${p.name}" ${max===1?'is':'are'} in stock.`); return; }
    setCart(prev=>{
      const e = prev.find(i=>i.id===p.id);
      return e ? prev.map(i=>i.id===p.id?{...i,qty:i.qty+1,stock:max}:i) : [...prev,{...p,qty:1}];
    });
  }
  function rm(id){setCart(p=>p.filter(i=>i.id!==id));}
  function upd(id,qty){
    if(qty<=0){rm(id);return;}
    const prod = prods.find(x=>x.id===id);
    const max = prod ? prod.stock : 0;
    if(qty > max){
      alert(`Only ${max} in stock.`);
      setCart(p=>p.map(i=>i.id===id?{...i,qty:Math.max(1,max)}:i));
      return;
    }
    setCart(p=>p.map(i=>i.id===id?{...i,qty}:i));
  }
  // If stock drops while a cart is open (admin edit, someone else buys the last one),
  // silently trim the cart down rather than letting checkout fail later.
  useEffect(()=>{
    if(prods.length===0 || cart.length===0) return;
    setCart(prev=>{
      let changed=false;
      const next=prev.map(i=>{
        const prod=prods.find(x=>x.id===i.id);
        const max=prod?prod.stock:0;
        if(i.qty>max){ changed=true; return {...i,qty:max,stock:max}; }
        return i;
      }).filter(i=>i.qty>0);
      return changed || next.length!==prev.length ? next : prev;
    });
  },[prods]);
  function goCustomer(){window.history.pushState({},'','/');setView('customer');}
  function goAdmin(){window.history.pushState({},'','/admin');setView('admin');}
  useEffect(()=>{
    function onPop(){setView(pathIsAdmin()?'admin':'customer');}
    window.addEventListener('popstate',onPop);
    return ()=>window.removeEventListener('popstate',onPop);
  },[]);
  // Loads data every visitor needs: products, online orders (+items), and site-wide settings
  // (homepage slideshow images + payment QR codes). Runs once on mount for both customer and admin views.
  // Truly public data: products + site settings. Safe to fetch while logged out.
  const reloadProducts = useCallback(async ()=>{
    const { data, error } = await supabase.from('products').select('*').order('id');
    if(error){ console.error('loadProducts error:', error.message); return; }
    setProds(data.map(fromDbProduct));
  },[]);
  // Re-pull inventory after a cancel restores batches, so the Inventory tab
  // reflects the returned stock without needing a full page reload.
  const reloadInventory = useCallback(async ()=>{
    const { data, error } = await supabase.from('inventory').select('*').order('id');
    if(error){ console.error('loadInventory error:', error.message); return; }
    setInv(data.map(fromDbInv));
  },[]);
  useEffect(()=>{
    async function loadPublicData(){
      const [prodRes, catRes, settingsRes] = await Promise.all([
        supabase.from('products').select('*').order('id'),
        supabase.from('categories').select('*').order('sort_order').order('name'),
        supabase.from('site_settings').select('*').eq('id',true).single(),
      ]);
      if(prodRes.error) console.error('loadProducts error:', prodRes.error.message);
      else setProds(prodRes.data.map(fromDbProduct));
      // Categories + their colours now come from the database instead of being
      // hardcoded here, so the admin's Category Manager edits actually stick.
      if(catRes.data && catRes.data.length){
        setCats(catRes.data.map(c=>c.name));
        const colors={};
        catRes.data.forEach(c=>{ colors[c.name]=c.color; });
        setCatColors(colors);
      } else if(catRes.error) console.error('loadCategories error:', catRes.error.message);
      if(settingsRes.data){
        setCustomSlides(settingsRes.data.custom_slides || []);
        setQrCodes(settingsRes.data.qr_codes || {alipay:'',wechat:''});
      } else if(settingsRes.error) console.error('loadSettings error:', settingsRes.error.message);
    }
    loadPublicData();
  },[]);
  // Orders are protected by RLS, so they can only be fetched once we have a session.
  // Re-runs on every login/logout. The DATABASE decides what comes back:
  // a customer sees only their own rows, an admin sees all of them.
  const loadOrders = useCallback(async ()=>{
    if(!auth.loggedIn || !auth.user?.id){ setOrders([]); return; }
    const [orderRes, orderItemRes] = await Promise.all([
      supabase.from('orders').select('*').order('created_at',{ascending:false}),
      supabase.from('order_items').select('*'),
    ]);
    if(orderRes.error){ console.error('loadOrders error:', orderRes.error.message); return; }
    if(orderItemRes.error){ console.error('loadOrderItems error:', orderItemRes.error.message); return; }
    setOrders(orderRes.data.map(o=>fromDbOrder(o, (orderItemRes.data||[]).filter(it=>it.order_id===o.id))));
  },[auth.loggedIn, auth.user?.id]);
  useEffect(()=>{ loadOrders(); },[loadOrders]);
  // Loads admin-only data: inventory, deleted-inventory archive, sales (+items), and purchase orders.
  // Gated to the admin view so ordinary customers never trigger these queries.
  useEffect(()=>{
    if(view!=='admin' || !auth.loggedIn || auth.user?.role!=='admin') return;
    async function loadAdminData(){
      const [invRes, archRes, salesRes, saleItemRes, posRes] = await Promise.all([
        supabase.from('inventory').select('*').order('id'),
        supabase.from('inventory_archive').select('*').order('archived_at',{ascending:false}),
        supabase.from('sales').select('*').order('id',{ascending:false}),
        supabase.from('sale_items').select('*'),
        supabase.from('purchase_orders').select('*').order('po_num'),
      ]);
      if(invRes.data) setInv(invRes.data.map(fromDbInv));
      else if(invRes.error) console.error('loadInventory error:', invRes.error.message);
      if(archRes.data) setDelInv(archRes.data.map(r=>r.original_data));
      else if(archRes.error) console.error('loadArchive error:', archRes.error.message);
      if(salesRes.data && saleItemRes.data){
        setSales(salesRes.data.map(s=>fromDbSale(s, saleItemRes.data.filter(it=>it.sale_id===s.id))));
      } else if(salesRes.error) console.error('loadSales error:', salesRes.error.message);
      if(posRes.data) setPOs(posRes.data.map(fromDbPO));
      else if(posRes.error) console.error('loadPurchaseOrders error:', posRes.error.message);
    }
    loadAdminData();
  },[view, auth.loggedIn, auth.user?.role]);
  useEffect(()=>{
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setAuth({
          loggedIn: true,
          user: {
            id: session.user.id,
            name: profile?.full_name || session.user.email?.split('@')[0] || 'Customer',
            mobile: profile?.mobile || '',
            email: profile?.email || session.user.email || '',
            role: profile?.role || 'customer',
          },
        });
      }
    });

    // NOTE: never `await` directly inside this callback — supabase-js can deadlock.
    // Defer the profile fetch to a microtask instead.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) { setAuth({ loggedIn: false, user: null }); return; }
      setTimeout(async () => {
        const profile = await fetchProfile(session.user.id);
        setAuth({
          loggedIn: true,
          user: {
            id: session.user.id,
            name: profile?.full_name || session.user.email?.split('@')[0] || 'Customer',
            mobile: profile?.mobile || '',
            email: profile?.email || session.user.email || '',
            role: profile?.role || 'customer',
          },
        });
      }, 0);
    });
    return () => listener.subscription.unsubscribe();
  },[]);
  return(
    <div style={{fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',minHeight:'100vh'}}>
      {view==='customer'
        ?<CustomerApp prods={prods} cats={cats} cart={cart} addToCart={addToCart} rm={rm} upd={upd} orders={orders} setOrders={setOrders} setCart={setCart} lang={lang} setLang={setLang} auth={auth} setAuth={setAuth} customSlides={customSlides} qrCodes={qrCodes} onOrdersChanged={loadOrders} reloadProducts={reloadProducts}/>
        :(auth.loggedIn && auth.user?.role==='admin'
            ?<AdminApp prods={prods} setProds={setProds} cats={cats} setCats={setCats} catColors={catColors} setCatColors={setCatColors} inv={inv} setInv={setInv} delInv={delInv} setDelInv={setDelInv} orders={orders} setOrders={setOrders} sales={sales} setSales={setSales} pos={pos} setPOs={setPOs} customSlides={customSlides} setCustomSlides={setCustomSlides} goCustomer={goCustomer} qrCodes={qrCodes} setQrCodes={setQrCodes} reloadProducts={reloadProducts} reloadInventory={reloadInventory} onLogout={async()=>{await supabase.auth.signOut();setAuth({loggedIn:false,user:null});}}/>
            :<AdminLogin onLogin={(u)=>setAuth({loggedIn:true,user:u})}/>
          )
      }
    </div>
  );
}
