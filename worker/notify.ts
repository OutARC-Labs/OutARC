const WEBHOOK = process.env.DISCORD_WEBHOOK_URL!

async function sendEmbed(embed: object) {
  await fetch(WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  })
}

export async function notifyApplied(params: {
  jobTitle: string
  company: string
  handshakeUrl: string
  coverLetterSnippet: string
}) {
  await sendEmbed({
    title: 'Applied',
    color: 0x2a7a4a,
    fields: [
      { name: 'Role', value: params.jobTitle, inline: true },
      { name: 'Company', value: params.company, inline: true },
      { name: 'Link', value: params.handshakeUrl, inline: false },
      { name: 'Cover Letter Preview', value: params.coverLetterSnippet.slice(0, 200) + '...' },
    ],
    timestamp: new Date().toISOString(),
  })
}

export async function notifyFailed(params: {
  jobTitle: string
  company: string
  reason: string
}) {
  await sendEmbed({
    title: 'Application Failed',
    color: 0xc0392b,
    fields: [
      { name: 'Role', value: params.jobTitle, inline: true },
      { name: 'Company', value: params.company, inline: true },
      { name: 'Reason', value: params.reason, inline: false },
    ],
    timestamp: new Date().toISOString(),
  })
}