package main

import (
	"bufio"
	"debug/elf"
	"debug/gosym"
	"fmt"
	"os"
	"strconv"
	"strings"
)

// usage: line2pc <binary> < file:line pairs on stdin
func main() {
	f, err := elf.Open(os.Args[1])
	if err != nil { panic(err) }
	defer f.Close()
	pcln, _ := f.Section(".gopclntab").Data()
	tab, err := gosym.NewTable(nil, gosym.NewLineTable(pcln, f.Section(".text").Addr))
	if err != nil { panic(err) }
	sc := bufio.NewScanner(os.Stdin)
	sc.Buffer(make([]byte, 1<<20), 1<<20)
	for sc.Scan() {
		s := strings.TrimSpace(sc.Text())
		if s == "" { continue }
		parts := strings.Split(s, "\t")
		spec := parts[0]
		idx := strings.LastIndex(spec, ":")
		file, ln := spec[:idx], spec[idx+1:]
		line, err := strconv.Atoi(ln)
		if err != nil { fmt.Printf("%s: bad line\n", spec); continue }
		pc, fn, err := tab.LineToPC(file, line)
		if err != nil {
			fmt.Printf("%s: ERR %v\n", spec, err)
			continue
		}
		fmt.Printf("%s -> pc=%#x func=%s\n", spec, pc, fn.Name)
	}
}
