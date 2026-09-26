package main

import (
	"debug/elf"
	"encoding/binary"
	"fmt"
	"os"
	"sort"
	"strconv"
)

type funct struct {
	entry     uint64
	name      string
	pclnOff   uint32
	pcfileOff uint32
	startLine int32
}

var pcln []byte
var pctabOff, pclnOff, textStart, quantum, funcnameOff uint64
var fns []funct

func uvarint(b []byte, i *int) uint64 {
	var v uint64
	var s uint
	for {
		c := b[*i]
		*i++
		v |= uint64(c&0x7f) << s
		if c&0x80 == 0 { break }
		s += 7
	}
	return v
}
func svarint(b []byte, i *int) int64 {
	u := uvarint(b, i)
	v := int64(u >> 1)
	if u&1 != 0 { v = ^v }
	return v
}

// decode all (startPcRel, val) pairs from a pctab table at off
func pcvalues(off uint32) [][2]int64 {
	var out [][2]int64
	i := int(pctabOff) + int(off)
	pc := int64(0)
	v := int64(-1)
	for {
		uv := uvarint(pcln, &i)
		if uv == 0 { break }
		sv := svarint(pcln, &i)
		pc += int64(uv * quantum)
		v += sv
		out = append(out, [2]int64{pc, v})
	}
	return out
}

func valAt(off uint32, rel int64) int64 {
	pairs := pcvalues(off)
	val := int64(-1)
	for _, p := range pairs {
		if p[0] <= rel {
			val = p[1]
		} else {
			break
		}
	}
	return val
}

func funcForPC(pc uint64) *funct {
	i := sort.Search(len(fns), func(i int) bool { return fns[i].entry > pc }) - 1
	if i < 0 { return nil }
	return &fns[i]
}

func main() {
	f, _ := elf.Open(os.Args[1])
	defer f.Close()
	pcln, _ = f.Section(".gopclntab").Data()
	quantum = uint64(pcln[6])
	nfunc := binary.LittleEndian.Uint64(pcln[8:])
	textStart = binary.LittleEndian.Uint64(pcln[24:])
	funcnameOff = binary.LittleEndian.Uint64(pcln[32:])
	pctabOff = binary.LittleEndian.Uint64(pcln[56:])
	pclnOff = binary.LittleEndian.Uint64(pcln[64:])
	for i := uint64(0); i < nfunc; i++ {
		eo := binary.LittleEndian.Uint32(pcln[pclnOff+i*8:])
		fo := binary.LittleEndian.Uint32(pcln[pclnOff+i*8+4:])
		fb := pclnOff + uint64(fo)
		entry := textStart + uint64(eo)*quantum
		nameOff := binary.LittleEndian.Uint32(pcln[fb+4:])
		pcfile := binary.LittleEndian.Uint32(pcln[fb+16:])
		pclno := binary.LittleEndian.Uint32(pcln[fb+20:])
		startLine := int32(binary.LittleEndian.Uint32(pcln[fb+36:]))
		no := funcnameOff + uint64(nameOff)
		end := no
		for pcln[end] != 0 { end++ }
		fns = append(fns, funct{entry, string(pcln[no:end]), pclno, pcfile, startLine})
	}
	for _, a := range os.Args[2:] {
		v, _ := strconv.ParseUint(a, 0, 64)
		fn := funcForPC(v)
		if fn == nil { fmt.Printf("%#x: none\n", v); continue }
		rel := int64(v - fn.entry)
		lv := valAt(fn.pclnOff, rel)
		fv := valAt(fn.pcfileOff, rel)
		fmt.Printf("%#x: %s startLine=%d lineval=%d fileval=%d\n", v, fn.name, fn.startLine, lv, fv)
	}
}
