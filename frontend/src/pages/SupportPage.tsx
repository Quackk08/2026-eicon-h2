import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  Check,
  MessageSquareText,
  Phone,
  Save,
  ShieldCheck,
  Trash2,
  UserRoundPlus,
  X
} from "lucide-react";
import { useAppState } from "../state/AppState";

const messageStarters = [
  "Could you check in with me when you have a moment?",
  "Today feels heavier than usual. Could we talk for a few minutes?",
  "I do not need advice right now, but I would appreciate some company."
];

export function SupportPage() {
  const { data, updateData } = useAppState();
  const [editingContact, setEditingContact] = useState(!data.trustedContact);
  const [name, setName] = useState(data.trustedContact?.name ?? "");
  const [phone, setPhone] = useState(data.trustedContact?.phone ?? "");
  const [relationship, setRelationship] = useState(data.trustedContact?.relationship ?? "");
  const [message, setMessage] = useState(messageStarters[0]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [approved, setApproved] = useState(false);

  const saveContact = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateData((current) => ({
      ...current,
      trustedContact: { name: name.trim(), phone: phone.trim(), relationship: relationship.trim() }
    }));
    setEditingContact(false);
  };

  const removeContact = () => {
    updateData((current) => ({ ...current, trustedContact: null }));
    setName("");
    setPhone("");
    setRelationship("");
    setPreviewOpen(false);
    setApproved(false);
    setEditingContact(true);
  };

  const openPreview = () => {
    setApproved(false);
    setPreviewOpen(true);
  };

  const safePhone = phone.replace(/[^+\d]/g, "");
  const smsHref = `sms:${safePhone}?body=${encodeURIComponent(message)}`;
  const telHref = `tel:${safePhone}`;

  return (
    <main className="app-page support-page">
      <header className="support-heading">
        <div>
          <p className="app-kicker">Support stays user-controlled</p>
          <h1>Reach someone you already trust.</h1>
          <p>ReNew can prepare a handoff. It never sends a message, starts a call, or shares your data on its own.</p>
        </div>
        <ShieldCheck aria-hidden="true" />
      </header>

      <div className="support-grid">
        <section className="trusted-contact-panel" aria-labelledby="trusted-contact-title">
          <div className="settings-section-heading">
            <UserRoundPlus aria-hidden="true" />
            <div><p className="app-kicker">Trusted Contact</p><h2 id="trusted-contact-title">Someone you choose</h2></div>
          </div>

          {editingContact ? (
            <form className="contact-form" onSubmit={saveContact}>
              <div className="field-group">
                <label htmlFor="contact-name">Name</label>
                <input id="contact-name" value={name} maxLength={80} onChange={(event) => setName(event.target.value)} required />
              </div>
              <div className="field-group">
                <label htmlFor="contact-phone">Phone number</label>
                <input id="contact-phone" type="tel" value={phone} maxLength={30} onChange={(event) => setPhone(event.target.value)} required />
              </div>
              <div className="field-group">
                <label htmlFor="contact-relationship">Relationship</label>
                <input id="contact-relationship" value={relationship} maxLength={80} placeholder="Friend, parent, mentor" onChange={(event) => setRelationship(event.target.value)} required />
              </div>
              <button className="primary-command" type="submit"><Save aria-hidden="true" /> Save contact</button>
            </form>
          ) : (
            <div className="saved-contact">
              <span>{data.trustedContact?.relationship}</span>
              <h3>{data.trustedContact?.name}</h3>
              <p>{data.trustedContact?.phone}</p>
              <div>
                <button className="secondary-command" type="button" onClick={() => setEditingContact(true)}>Edit</button>
                <button className="text-button" type="button" onClick={removeContact}><Trash2 aria-hidden="true" /> Remove</button>
              </div>
            </div>
          )}
        </section>

        <section className="support-message-panel" aria-labelledby="support-message-title">
          <div className="settings-section-heading">
            <MessageSquareText aria-hidden="true" />
            <div><p className="app-kicker">Message</p><h2 id="support-message-title">Write only what you want to share</h2></div>
          </div>
          <div className="message-starters" aria-label="Message starters">
            {messageStarters.map((starter, index) => (
              <button className={message === starter ? "is-active" : ""} type="button" onClick={() => setMessage(starter)} key={starter}>
                0{index + 1}
              </button>
            ))}
          </div>
          <label className="support-message-field">
            Message text
            <textarea rows={7} maxLength={500} value={message} onChange={(event) => setMessage(event.target.value)} />
          </label>
          <button className="primary-command" type="button" onClick={openPreview} disabled={!data.trustedContact || !message.trim()}>
            Review handoff <ArrowRight aria-hidden="true" />
          </button>
          {!data.trustedContact && <p className="support-required">Save a Trusted Contact before reviewing a handoff.</p>}
        </section>
      </div>

      {previewOpen && data.trustedContact && (
        <section className="handoff-preview" aria-labelledby="handoff-title">
          <div className="handoff-heading">
            <div><p className="app-kicker">Full preview</p><h2 id="handoff-title">Nothing happens until you choose.</h2></div>
            <button className="icon-button" type="button" aria-label="Close preview" title="Close preview" onClick={() => setPreviewOpen(false)}><X aria-hidden="true" /></button>
          </div>
          <dl>
            <div><dt>Recipient</dt><dd>{data.trustedContact.name} / {data.trustedContact.relationship}</dd></div>
            <div><dt>Channel</dt><dd>Your device’s SMS or phone app</dd></div>
            <div className="handoff-message"><dt>Full message</dt><dd>{message}</dd></div>
            <div><dt>Included</dt><dd>Phone number and the exact message above</dd></div>
            <div><dt>Excluded</dt><dd>Check-In values, Reflection history, diagnosis language, and location</dd></div>
          </dl>
          <label className="handoff-approval">
            <input type="checkbox" checked={approved} onChange={(event) => setApproved(event.target.checked)} />
            <span>I reviewed the recipient, channel, full message, included data, and excluded data.</span>
          </label>
          <div className="handoff-actions">
            <a className={approved ? "primary-command" : "primary-command is-disabled"} href={approved ? smsHref : undefined} aria-disabled={!approved}>
              <MessageSquareText aria-hidden="true" /> Open SMS
            </a>
            <a className={approved ? "secondary-command" : "secondary-command is-disabled"} href={approved ? telHref : undefined} aria-disabled={!approved}>
              <Phone aria-hidden="true" /> Open phone
            </a>
          </div>
        </section>
      )}

      <section className="formal-support-note">
        <div><ShieldCheck aria-hidden="true" /><div><strong>Formal support is separate from Community</strong><p>Regional support resources will be configured before production. If you are in immediate danger, contact your local emergency services.</p></div></div>
        <span>No automatic contact</span>
      </section>
    </main>
  );
}
