---
layout: post
title: "I Broke My Pop!_OS Boot, Then Fixed It by Deleting One File (With a Little CSI: Linux)"
date: 2025-11-04 00:00:00 +0000
categories:
  - linux
  - popos
  - nerdstuff
---

**TL;DR:** I ran `fwupdmgr update --offline` because the normal update couldn’t find a file. My machine fell into an infinite “Upgrade complete. Autoremoving old packages…” → reboot loop. I spelunked through TTYs, LUKS, **LVM**, chroot, `dpkg --configure -a`, `update-initramfs`, `bootctl`, and a `/dev/pts` heckle. The real culprit? A leftover **systemd offline-update marker**: `/system-update`. Deleting it ended the loop.

---

## The Setup: “Just a Firmware Update, How Bad Could It Be?”

I wanted to be a responsible adult and update firmware:

```bash
sudo fwupdmgr update
```

It shrugged and said a file couldn’t be found. Fine! I escalated:

```bash
sudo fwupdmgr update --offline
```

Reboot. Pop!_OS splash. Then:

> **“Upgrade complete. Autoremoving old packages…”**

…and **reboot**. Then again. And again. Linux Groundhog Day.

---

## Act I: Down the Rabbit Hole (TTY, LUKS, and… LVM!)

I jumped into a recovery shell. First lesson (again): **`crypto_LUKS` isn’t a filesystem**, it’s a vault. Unlock it, then mount whatever’s inside.

In my case, inside the LUKS container was **LVM**, so the *correct* mount path was:

```bash
sudo -i

# 1) LUKS öffnen
cryptsetup luksOpen /dev/nvme0n1p3 cryptroot

# 2) LVM erkennen und aktivieren
vgscan
vgchange -ay
lvs      # shows VG/LV names, e.g., pop-os-vg/root

# 3) Root-LV mounten (not the bare cryptroot)
mount /dev/mapper/<VG>-<LV> /mnt
```

Then the standard chroot ballet:

```bash
for i in dev proc sys run; do mount --bind /$i /mnt/$i; done
chroot /mnt /bin/bash
```

Package spa day:

```bash
dpkg --configure -a
apt -f install
apt update
apt full-upgrade
```

APT heckled me with **“Cannot write log: Is /dev/pts mounted?”**, which is a polite way of saying *“mount devpts, please.”*
I obliged:

```bash
mount -t devpts devpts /dev/pts
```

---

## Act II: Suspicious Warnings and Bootloader Side Quests

`update-initramfs` complained:

```
warning: target 'cryptroot' not found in /etc/crypttab
```

I added the proper entry:

```
cryptroot UUID=<my-luks-uuid> none luks,discard
```

Then rebuilt:

```bash
update-initramfs -u -k "$(ls -1 /lib/modules | sort -V | tail -1)"
```

Bootloader courtesy visit:

```bash
kernelstub -v
bootctl update || true
```

`bootctl` responded: *“Skipping systemd-bootx64.efi since a newer boot loader version exists already.”*
That’s normal when your ESP already has a newer bootloader than the chroot environment.

I unmounted like a pro, rebooted…

…and got **“Upgrade complete. Autoremoving old packages…”** → reboot. Again.

---

## Plot Twist: The 9.5-Second Video That Solved Everything

At this point I recruited ChatGPT and uploaded a short boot video.
It pulled a few frames and spotted the telltale line:

> **“Upgrade complete. Autoremoving old packages…”**

…right before a clean reboot. That pattern screams **systemd offline update mode** still being active. In other words, the marker file that tells systemd *“boot into the offline updater”* never got cleaned up.

I checked:

```bash
ls -l /system-update /etc/system-update
```

There it was: **`/system-update`**, sitting smugly like a tiny chaos gremlin.

I removed it:

```bash
sudo rm -f /system-update /etc/system-update
```

Reboot.
No loop. Desktop. Happiness.

**How ChatGPT guessed:** the video showed a successful-looking “Upgrade complete. Autoremoving old packages…” *followed immediately by a reboot*, with no login ever reached. That’s textbook offline-update behavior: systemd boots into a special target, runs updates, then reboots. If the **marker file** sticks around, it does that **every time**. The frame text + reboot timing was the smoking gun.

---

## Why This Works

* `fwupdmgr update --offline` uses systemd’s offline-update mechanism.
* systemd looks for `/system-update` (or `/etc/system-update`). If present, it boots into `system-update.target` to run updates before the real boot.
* If the process fails or cleanup never happens, the marker persists → **every boot** repeats the “update + reboot.”
* Deleting the marker lets the system boot normally.

---

## The Minimal Escape Plan

If you ever hit the same loop:

```bash
# Kill the trigger
sudo rm -f /system-update /etc/system-update

# (Optional) sanity checks
systemctl get-default
# If it somehow says system-update.target:
# sudo systemctl set-default graphical.target

# (Optional) finish any pending package business
sudo dpkg --configure -a
sudo apt -f install
sudo apt autoremove --purge -y
```

If you’re on LUKS+LVM and need to chroot again, remember the **LVM** bit:

```bash
cryptsetup luksOpen /dev/nvme0n1p3 cryptroot
vgscan && vgchange -ay && lvs
mount /dev/mapper/<VG>-<LV> /mnt
for i in dev proc sys run; do mount --bind /$i /mnt/$i; done
chroot /mnt /bin/bash
```

---

## Lessons (Gently Roasted)

* “Offline” means *really* offline; don’t interrupt it.
* `crypto_LUKS` ≠ filesystem. Inside may be LVM; mount the **LV**, not the raw mapper.
* `Is /dev/pts mounted?` is more of a vibe check than a catastrophe.
* A single file—**`/system-update`**—can keep your OS circling like a Roomba.

---

## Epilogue

I wanted a firmware update. I got a crash course in LUKS, LVM, initramfs, and systemd’s secret handshake. One tiny marker file caused a very big loop; one tiny `rm -f` made me feel like a wizard.

If this saved you from the “Upgrade complete. Autoremoving old packages…” purgatory, treat yourself to a coffee. Future you says thanks.

