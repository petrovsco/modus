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
