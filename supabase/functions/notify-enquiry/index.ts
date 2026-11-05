// Emails you whenever someone submits the Get in Touch form.
//
// Setup:
//  1. Sign up at resend.com (free tier covers a small business), verify your domain,
//     and create an API key.
//  2. Install the Supabase CLI, then from the project root:
//       supabase secrets set RESEND_API_KEY=re_xxx NOTIFY_TO=you@yourdomain.com NOTIFY_FROM=website@yourdomain.com
//       supabase functions deploy notify-enquiry --no-verify-jwt
//  3. In Supabase Studio → Database → Webhooks → Create a new hook:
//       Table: contact_messages   Events: Insert
//       Type: Supabase Edge Function → notify-enquiry
//
// Enquiries still appear in the admin panel either way — this just means you
// find out about them without logging in.

Deno.serve(async (req) => {
  try {
    const { record } = await req.json()
    const key = Deno.env.get('RESEND_API_KEY')
    const to = Deno.env.get('NOTIFY_TO')
    const from = Deno.env.get('NOTIFY_FROM')
    if (!key || !to || !from) {
      return new Response('Missing RESEND_API_KEY, NOTIFY_TO or NOTIFY_FROM', { status: 500 })
    }

    const esc = (s: string) => String(s ?? '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]!))
    const row = (label: string, value?: string) =>
      value ? `<tr><td style="padding:4px 12px 4px 0;color:#77878F;font:12px monospace;text-transform:uppercase">${label}</td><td style="padding:4px 0">${esc(value)}</td></tr>` : ''

    const html = `
      <div style="font-family:system-ui,sans-serif;color:#0B2231;max-width:600px">
        <p style="font:12px monospace;letter-spacing:.2em;color:#1F6F5C;text-transform:uppercase">New enquiry</p>
        <h2 style="margin:4px 0 16px">${esc(record.subject || 'Website enquiry')}</h2>
        <table style="border-collapse:collapse;font-size:15px">
          ${row('Name', record.name)}
          ${row('Company', record.company)}
          ${row('Email', record.email)}
          ${row('Phone', record.phone)}
        </table>
        <p style="white-space:pre-wrap;line-height:1.7;margin-top:16px;padding-top:16px;border-top:1px solid #e0e3dd">${esc(record.message)}</p>
        <p style="font-size:13px;color:#77878F">Reply straight to this email to answer ${esc(record.name)}.</p>
      </div>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from, to: [to], reply_to: record.email || undefined,
        subject: `Enquiry from ${record.name}${record.company ? ` (${record.company})` : ''}`,
        html
      })
    })

    if (!res.ok) return new Response(await res.text(), { status: 502 })
    return new Response('sent', { status: 200 })
  } catch (e) {
    return new Response(String(e), { status: 400 })
  }
})
