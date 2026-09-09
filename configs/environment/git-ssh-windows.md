# Environment: Git SSH push fix (Windows + Git Bash)

**Type:** machine-level git config (`~/.gitconfig`), not a per-repo file.
**Scope:** global — set once per Windows machine; every repo inherits it.
**Applies when:** you push over SSH from Git Bash on Windows and it hangs / fails
auth, even though the SSH key is valid.

---

## Symptom

`git push` from Git Bash fails (auth error or hang) on **every** repo, regardless of
the key. The key is *not* the problem — Git Bash's bundled OpenSSH client doesn't use
the same agent/config as Windows-native OpenSSH, so it can't find the key.

## Fix

Point git at the Windows-native `ssh.exe` **globally**, so all repos use it:

```bash
git config --global core.sshCommand "C:/WINDOWS/System32/OpenSSH/ssh.exe"
```

- Verify the path exists first (`ls "C:/WINDOWS/System32/OpenSSH/ssh.exe"`); it ships
  with Windows 10/11 OpenSSH.
- Setting it **globally** (not per-repo) is the point: a per-repo `core.sshCommand`
  only fixes that one clone — new clones start broken again. Global fixes the whole
  environment.
- If any repo has a stale per-repo override, drop it so global governs:
  `git config --local --unset core.sshCommand`.
- No secrets involved. This only selects which `ssh` binary git invokes.

## Second failure mode: agent service stopped + passphrase-protected key

Even with `core.sshCommand` set correctly, a non-interactive push can **hang
silently**: if the *OpenSSH Authentication Agent* Windows service is stopped and
the key has a passphrase, ssh waits forever for a prompt nobody sees (in
`BatchMode=yes` it fails fast with `Permission denied (publickey)` instead —
useful for diagnosis). Fix (2026-08-25, hit in practice):

```powershell
Set-Service ssh-agent -StartupType Automatic   # survive reboots
Start-Service ssh-agent
ssh-add                                        # type the passphrase once
```

`ssh-add -l` should then list the key; pushes work from any shell.

### Why it comes back after a restart (2026-09-09)

Applying only half of the block above is the trap. `Start-Service` lasts until
the next shutdown; `Set-Service -StartupType Automatic` is the half that makes
it permanent. A machine that ran for a week without a reboot looks fixed,
because the agent from that one manual start is still up — the first restart is
when pushes break again.

Diagnose it in one command, from Git Bash, WSL, or PowerShell:

```bash
sc.exe qc ssh-agent | grep START_TYPE      # DEMAND_START = Manual = will not survive a reboot
sc.exe query ssh-agent | grep -E "STATE|EXIT"
```

Exit code **1077** means "not started since the last boot" — nobody and nothing
tried, which is exactly what a Manual service does after a restart.

Two things that are easy to get wrong:

- **`ssh-add` is once per key, not once per boot.** The Windows agent keeps
  added keys in `HKCU\Software\OpenSSH\Agent\Keys` (DPAPI-encrypted, readable
  only by the service). After a reboot, starting the service is enough — the
  key is already in it. Re-running `ssh-add` is harmless but unnecessary.
- **Starting the service does not need admin; changing its startup type does.**
  `sc.exe start ssh-agent` works from an ordinary shell, so an unelevated
  session can unblock itself today. Only `Set-Service -StartupType Automatic`
  needs the elevated prompt, and it is the one that has to be run once.

This covers WSL as well. A `git push` from WSL runs the Windows `ssh.exe` named
in `core.sshCommand`; it inherits `USERPROFILE`, reads `C:\Users\<you>\.ssh`,
and talks to the same Windows agent. Note that a WSL-side copy of the key at
`~/.ssh/` does not help: with `BatchMode=yes` an encrypted key cannot be
unlocked, and the copy under `/mnt/c/...` is refused outright because drvfs
reports it as mode 0777.
