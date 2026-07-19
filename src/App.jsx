import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { supabase } from './supabaseClient';

// The entire admin panel is loaded on demand (its own bundle chunk), so a
// customer visiting the storefront never downloads any of the admin code.
const AdminApp = React.lazy(() => import('./AdminApp.jsx'));

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

export const G = {
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

export const ICONS = {'Essentials':'🌾','Basic Spices':'🌿','Spice Blends':'🌶️','Desserts':'🍮','Snacks':'🥨'};

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

export const ep = p => p.offer && p.disc > 0 ? +(p.sp*(1-p.disc/100)).toFixed(2) : p.sp;
export const cf = kg => kg > 0 ? Math.max(1, Math.ceil(kg)) * 5 : 0;
export const bjDate = () => new Date().toISOString().split('T')[0];
export const bjTime = () => new Date().toLocaleTimeString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false});
export const nid = arr => arr.length > 0 ? Math.max(...arr.map(x=>x.id))+1 : 1;
export const nextSeq = sales => sales.length ? Math.max(...sales.map(s=>s.seq||0))+1 : 1;

export function expStyle(d) {
  if(!d) return {};
  const diff = (new Date(d) - new Date()) / 86400000;
  if(diff < 0) return {background:'#FFCDD2'};
  if(diff < 90) return {background:'#BBDEFB'};
  if(diff < 180) return {background:'#FFF9C4'};
  return {background:'#C8E6C9'};
}

export function stStyle(n) {
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

export function openPrintWindow(html){
  const w=window.open('','_blank');
  if(!w){alert('Please allow pop-ups for this site to print or save the PDF.');return;}
  w.document.write(html); w.document.close(); w.focus();
  setTimeout(()=>{try{w.print();}catch(e){}},350);
}
export function buildPOHTML({poNum,date,time,vendor,hdr,items,totQty,totC,totS,bdLC,chnLC,grand}){
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
export function buildSalesReceiptHTML({orderNo,cname,mob,addr,items,sub,pad,cour,grand,hasDsc}){
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

export function Btn({children,onClick,v='primary',sm=false,style={},disabled=false}) {
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

export function FInput({label,value,onChange,placeholder='',type='text',req=false,style={}}) {
  return (
    <div style={{marginBottom:10}}>
      {label && <div style={{fontSize:11,color:G.tx,marginBottom:3,fontWeight:'600'}}>{label}{req&&<span style={{color:G.rd}}> *</span>}</div>}
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} type={type}
        style={{width:'100%',padding:'8px 11px',borderRadius:8,border:`1px solid ${G.brd}`,fontSize:13,boxSizing:'border-box',outline:'none',color:G.dk,background:G.w,...style}}/>
    </div>
  );
}

export function FSel({label,value,onChange,options=[]}) {
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

export function Overlay({title,onClose,children,width=560}) {
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

export function Card({children,style={}}) {
  return <div style={{background:G.w,borderRadius:12,padding:16,boxShadow:'0 2px 10px rgba(20,40,25,0.06)',border:`1px solid ${G.brd}`,...style}}>{children}</div>;
}

export function Stat({icon,label,value,color=G.gm}) {
  return (
    <Card style={{textAlign:'center',padding:'14px 10px'}}>
      <div style={{fontSize:26,marginBottom:4}}>{icon}</div>
      <div style={{fontSize:20,fontWeight:'bold',color}}>{value}</div>
      <div style={{fontSize:11,color:G.tx,marginTop:2}}>{label}</div>
    </Card>
  );
}

export function CatChip({cat,catColors}) {
  const c = (catColors && catColors[cat]) || '#757575';
  return <span style={{background:c+'22',color:c,borderRadius:10,padding:'2px 9px',fontSize:11,fontWeight:'bold',whiteSpace:'nowrap'}}>{cat}</span>;
}

// Catches a render crash in any tab and shows the actual error instead of a blank
// black screen — a white page with the message beats silence when something breaks.
export class TabErrorBoundary extends React.Component {
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

export function ConfirmDlg({msg,onYes,onNo}) {
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

export function ComboInput({value,onChange,onPick,options,placeholder}) {
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

export function CatManageOverlay({cats,setCats,catColors,setCatColors,prods,onClose}) {
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

// Lighten (amt>0) or darken (amt<0) a hex colour; amt ranges -1..1.
// Used to turn a flat category colour into a pleasant slide gradient.
function shade(hex, amt){
  const h=(hex||'#888888').replace('#','');
  const n=h.length===3 ? h.split('').map(c=>c+c).join('') : h;
  const ch=(i)=>parseInt(n.slice(i,i+2),16)||0;
  const mix=(c)=> amt<0 ? c*(1+amt) : c+(255-c)*amt;
  const to=(c)=>Math.max(0,Math.min(255,Math.round(mix(c)))).toString(16).padStart(2,'0');
  return '#'+to(ch(0))+to(ch(2))+to(ch(4));
}

export function Slideshow({slides,addToCart}) {
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
    <div style={{position:'relative',borderRadius:18,overflow:'hidden',margin:'14px 16px 18px',height:172,background:s.bg||bgMap[s.kind],color:'#fff',boxShadow:'0 6px 18px rgba(0,0,0,0.18)'}}>
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
          {/* Product sits directly on the gradient. objectFit:contain keeps the
              photo's proportions (no stretching), and drop-shadow traces the
              product's outline when the photo has a transparent background. */}
          <div style={{flexShrink:0,width:98,height:98,borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',background:s.product.img?'transparent':'rgba(255,255,255,0.18)'}}>
            {s.product.img
              ? <img src={s.product.img} alt={s.product.name} style={{width:'100%',height:'100%',objectFit:'contain',filter:'drop-shadow(0 3px 8px rgba(0,0,0,0.35))'}}/>
              : <span style={{fontSize:46}}>{ICONS[s.product.cat]||'📦'}</span>}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{background:'rgba(255,255,255,0.22)',display:'inline-block',borderRadius:8,padding:'2px 9px',fontSize:11,fontWeight:'bold',marginBottom:6}}>{s.tag||tagMap[s.kind]}</div>
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

function HomeTab({products,categories,addToCart,setTab,t,customSlides,catColors}) {
  const bs = products.filter(p=>p.bs&&p.stock>0);
  const offers = products.filter(p=>p.offer&&p.stock>0);
  const slides = useMemo(()=>{
    // Admin-uploaded promo slides always lead.
    const cS=(customSlides||[]).map(c=>({kind:'custom',img:cdnImage(c.img),caption:c.caption}));

    // One standout in-stock product per category, each on its own category-coloured
    // backdrop, so the carousel showcases the whole range at a glance.
    const used=new Set();
    const catS=(categories||[]).map(cat=>{
      const inCat=products.filter(p=>p.cat===cat && p.stock>0);
      if(!inCat.length) return null;
      const pick=inCat.find(p=>!p.bs&&!p.isNew)||inCat[0];
      used.add(pick.id);
      const col=(catColors&&catColors[cat])||G.gm;
      return {
        kind:'category', product:pick,
        bg:`linear-gradient(135deg, ${shade(col,0.10)}, ${shade(col,-0.38)})`,
        tag:`${ICONS[cat]||'🏷️'} ${cat}`,
      };
    }).filter(Boolean);

    // Then a New Arrival and a Best Seller, skipping anything already shown above.
    const nS=products.filter(p=>p.isNew&&p.stock>0&&!used.has(p.id)).slice(0,1).map(p=>({kind:'fresh',product:p}));
    const bS=bs.filter(p=>!used.has(p.id)).slice(0,1).map(p=>({kind:'best',product:p}));

    return [...cS,...catS,...nS,...bS];
  },[products,categories,customSlides,catColors]);
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
export function ddmmyyyy(v){
  if(!v) return '';
  const d = new Date(v);
  if(isNaN(d)) return v;
  const p = (x)=>String(x).padStart(2,'0');
  return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()}`;
}

// A checkerboard, so a transparent image reads as transparent in a preview
// instead of looking like it has a white background.
export const CHECKER = {
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
export async function removeBackground(file, tolerance = 34) {
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

// ==================== Image optimiser (resize + WebP) ====================
// Shrinks an uploaded photo to a sensible pixel size and re-encodes it as WebP,
// which is a fraction of the size of the original JPEG/PNG at the same visual
// quality. This runs entirely in the browser BEFORE upload, so what lands in
// Storage  and therefore what every customer downloads  is already small.
// Falls back to PNG/JPEG on the rare browser that can't encode WebP.
export async function optimizeImage(file, { maxDim = 1000, quality = 0.9, transparent = false } = {}) {
  if (!file || !file.type || !file.type.startsWith('image/')) return file;
  // Don't rasterise vector art or flatten animated GIFs.
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file;

  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload  = () => res(i);
    i.onerror = () => rej(new Error('That image could not be read.'));
    i.src = URL.createObjectURL(file);
  });

  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));   // only ever shrink
  const w = Math.max(1, Math.round(img.width  * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  if (!transparent) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); }  // flatten alpha to white
  ctx.drawImage(img, 0, 0, w, h);
  URL.revokeObjectURL(img.src);

  const encode = (type, q) => new Promise(res => cv.toBlob(res, type, q));
  let blob = await encode('image/webp', quality);
  let ext  = 'webp';
  if (!blob || blob.type !== 'image/webp') {          // browser can't do WebP  fall back
    if (transparent) { blob = await encode('image/png');          ext = 'png'; }
    else             { blob = await encode('image/jpeg', quality); ext = 'jpg'; }
  }
  if (!blob) return file;                              // give up gracefully
  if (blob.size >= file.size) return file;             // never upload something larger

  const base = (file.name || 'image').replace(/\.[^.]+$/, '');
  return new File([blob], base + '.' + ext, { type: blob.type });
}

// ==================== Supabase Storage upload helper ====================
// Uploads a File to a public Storage bucket and returns its public URL.
// This is what replaces storing base64 image data inside the database —
// base64 made every product row enormous and slowed down every page load.
export async function uploadToBucket(bucket, file, folder='') {
  if(!file) return '';
  if(!file.type || !file.type.startsWith('image/')) throw new Error('Please choose an image file (JPG or PNG).');
  if(file.size > 5*1024*1024) throw new Error('That image is larger than 5MB. Please choose a smaller one.');
  const ext = ((file.name || '').split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g,'') || 'jpg';
  const path = `${folder ? folder + '/' : ''}${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
  const { error } = await supabase.storage.from(bucket)
    .upload(path, file, { cacheControl:'31536000', upsert:false, contentType:file.type });
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

// Product images live in Supabase Storage (Singapore) but are served to shoppers
// through a Cloudflare Worker on our own subdomain, which caches them at
// Cloudflare's edge instead of hitting Singapore on every view. We keep the raw
// Supabase URL in the database (so nothing breaks if the CDN ever changes) and
// only swap in the CDN host when handing an image to the browser.
const IMG_CDN    = 'https://cdn.groupbuy.trade';
const IMG_PUBLIC = '/storage/v1/object/public';   // the Supabase public-storage path segment

// DB (raw Supabase) -> display (Cloudflare CDN). Leaves non-Supabase URLs untouched.
function cdnImage(url){
  if(!url) return url;
  const i = url.indexOf(IMG_PUBLIC);
  if(i === -1) return url;
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co/i.test(url)) return url;
  return IMG_CDN + url.slice(i + IMG_PUBLIC.length);
}
// Display (CDN) -> DB (raw Supabase), so the database always stores the canonical
// storage URL. Rebuilt via the Supabase client, so there's no project ref to hardcode.
function rawImage(url){
  if(!url || !url.startsWith(IMG_CDN + '/')) return url;
  const rel = url.slice(IMG_CDN.length + 1);        // e.g. product-images/1699-ab12.webp
  const slash = rel.indexOf('/');
  if(slash === -1) return url;
  const bucket = rel.slice(0, slash);
  const key    = rel.slice(slash + 1);
  try { return supabase.storage.from(bucket).getPublicUrl(key).data.publicUrl; }
  catch { return url; }
}

// Products
export function fromDbProduct(row) {
  return {
    id: row.id, name: row.name, upc: row.upc || '', cat: row.category,
    unit: row.unit || 'PCS', pw: row.pack_weight, gw: row.gross_weight,
    sp: row.selling_price, cp: row.cost_price || 0, stock: row.stock || 0,
    disc: row.discount || 0, offer: !!row.on_offer, bs: !!row.best_seller,
    isNew: !!row.is_new, img: cdnImage(row.image_url || ''),
  };
}
export function toDbProduct(p) {
  return {
    name: p.name, upc: p.upc || null, category: p.cat, unit: p.unit || 'PCS',
    pack_weight: p.pw, gross_weight: p.gw, selling_price: p.sp, cost_price: p.cp || 0,
    stock: p.stock || 0, discount: p.disc || 0, on_offer: !!p.offer,
    best_seller: !!p.bs, is_new: !!p.isNew, image_url: rawImage(p.img) || null,
  };
}
// Inventory
export function fromDbInv(row) {
  return {
    id: row.id, date: row.date, ts: row.time || '', name: row.name,
    cat: row.category || '', qty: row.qty, exp: row.expiry_date,
    sp: row.selling_price || 0, cp: row.cost_price || 0, pw: row.pack_weight || 0,
    upc: row.upc || '',
  };
}
export function toDbInv(item, productId) {
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
export function findProductForBatch(prods, batch){
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
export function toDbSale(sale) {
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
export function fromDbPO(row) {
  return {
    id: row.id, poNum: row.po_num, date: row.date, time: row.time, vendor: row.vendor || '',
    hdr: row.hdr || { cr: '', sr: '', bdc: '', cnc: '' }, items: row.items || [],
    totQty: row.tot_qty, totC: row.tot_c, totS: row.tot_s, bdLC: row.bd_lc, chnLC: row.chn_lc, grand: row.grand,
  };
}
export function toDbPO(po) {
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
                  <img src={cdnImage(qrCodes[method])} alt={method+' QR code'} style={{width:160,height:160,objectFit:'contain',borderRadius:8,display:'block'}}/>
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

function CustomerApp({prods,cats,catColors,cart,addToCart,rm,upd,orders,setOrders,setCart,lang,setLang,auth,setAuth,customSlides,qrCodes,onOrdersChanged,reloadProducts}) {
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
        {tab==='home'&&<HomeTab products={prods} categories={cats} addToCart={addToCart} setTab={setTab} t={t} customSlides={customSlides} catColors={catColors}/>}
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
        ?<CustomerApp prods={prods} cats={cats} catColors={catColors} cart={cart} addToCart={addToCart} rm={rm} upd={upd} orders={orders} setOrders={setOrders} setCart={setCart} lang={lang} setLang={setLang} auth={auth} setAuth={setAuth} customSlides={customSlides} qrCodes={qrCodes} onOrdersChanged={loadOrders} reloadProducts={reloadProducts}/>
        :(auth.loggedIn && auth.user?.role==='admin'
            ?<React.Suspense fallback={<div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:G.mut}}>Loading admin</div>}><AdminApp prods={prods} setProds={setProds} cats={cats} setCats={setCats} catColors={catColors} setCatColors={setCatColors} inv={inv} setInv={setInv} delInv={delInv} setDelInv={setDelInv} orders={orders} setOrders={setOrders} sales={sales} setSales={setSales} pos={pos} setPOs={setPOs} customSlides={customSlides} setCustomSlides={setCustomSlides} goCustomer={goCustomer} qrCodes={qrCodes} setQrCodes={setQrCodes} reloadProducts={reloadProducts} reloadInventory={reloadInventory} onLogout={async()=>{await supabase.auth.signOut();setAuth({loggedIn:false,user:null});}}/></React.Suspense>
            :<AdminLogin onLogin={(u)=>setAuth({loggedIn:true,user:u})}/>
          )
      }
    </div>
  );
}
