package main

import (
	"fmt"
	"io/ioutil"
	"os"
	"os/exec"
	"path"
	"strings"

	"github.com/mitchellh/go-homedir"
)

func main() {
	home, err := homedir.Dir()
	if err != nil {
		panic(err)
	}
	workbenchDir := path.Join(home, ".solana-workbench")
	valArgs := []string{"--reset", "--ledger", path.Join(workbenchDir, "test-ledger")}
	valCmd := exec.Command("solana-test-validator", valArgs...)
	accountFiles, err := ioutil.ReadDir(path.Join(workbenchDir, "db", "accounts"))
	for _, accountFile := range accountFiles {
		valArgs = append(valArgs, "--account", accountFile.Name())
	}
    if err != nil && !os.IsNotExist(err) {
        panic(err)
    }
	bpfPrograms, err := ioutil.ReadDir(path.Join(workbenchDir, "db", "programs"))
	for _, bpfProgram := range bpfPrograms {
		valArgs = append(valArgs, "--bpf-program", bpfProgram.Name())
	}
    if err != nil && !os.IsNotExist(err) {
        panic(err)
    }
	fmt.Println("solana-test-validator", strings.Join(valArgs, " "))
	fmt.Println("")
	valCmd.Stdout = os.Stdout
	valCmd.Stderr = os.Stderr
	valCmd.Run()
}